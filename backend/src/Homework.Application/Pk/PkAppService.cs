using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys;
using Homework.Permissions;
using Homework.Pk.Dtos;
using Homework.Scoring;
using Homework.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Timing;

namespace Homework.Pk;

/// <summary>
/// 本周 PK 榜（Phase 1）：当前家长名下、正在跑旅程的孩子，按本周完成度排名。
/// 纯只读聚合，复用现有数据（DailyScore/ReadRange、Journey 宠物与背包）；无新模型、无定时任务。
/// </summary>
[Authorize(HomeworkPermissions.ParentAdmin)]
public class PkAppService : HomeworkAppService, IPkAppService
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<ChildProfile, Guid> _childRepository;
    private readonly IRepository<PetSpecies, Guid> _speciesRepository;
    private readonly IRepository<RewardItem, Guid> _rewardRepository;
    private readonly DailyTaskGenerator _generator;
    private readonly ChildProfileManager _childManager;
    private readonly IAssetUrlResolver _urls;
    private readonly IClock _clock;

    public PkAppService(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<ChildProfile, Guid> childRepository,
        IRepository<PetSpecies, Guid> speciesRepository,
        IRepository<RewardItem, Guid> rewardRepository,
        DailyTaskGenerator generator,
        ChildProfileManager childManager,
        IAssetUrlResolver urls,
        IClock clock)
    {
        _journeyRepository = journeyRepository;
        _childRepository = childRepository;
        _speciesRepository = speciesRepository;
        _rewardRepository = rewardRepository;
        _generator = generator;
        _childManager = childManager;
        _urls = urls;
        _clock = clock;
    }

    public async Task<WeeklyPkResultDto> GetWeeklyAsync()
    {
        var today = DateOnly.FromDateTime(_clock.Now);
        // 本周一：today 减去「距周一的天数」（周日=0→6, 周一=1→0 …）
        var weekStart = today.AddDays(-(((int)today.DayOfWeek + 6) % 7));
        var result = new WeeklyPkResultDto { WeekStart = weekStart, Through = today };

        var childIds = await _childManager.GetOwnedChildIdsAsync();
        if (childIds.Count == 0)
        {
            return result;
        }

        // 只取有 Active 旅程的孩子（连背包一起载入）
        var jq = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
        var journeys = await AsyncExecuter.ToListAsync(
            jq.Where(j => childIds.Contains(j.ChildId) && j.Status == JourneyStatus.Active));
        if (journeys.Count == 0)
        {
            return result;
        }

        // 批量载入：孩子档案、物种(含形态)、背包涉及的奖励物 —— 避免逐娃 N+1
        var onboardChildIds = journeys.Select(j => j.ChildId).Distinct().ToList();
        var children = (await _childRepository.GetListAsync(c => onboardChildIds.Contains(c.Id)))
            .ToDictionary(c => c.Id);

        var speciesIds = journeys.Where(j => j.PetSpeciesId != null)
            .Select(j => j.PetSpeciesId!.Value).Distinct().ToList();
        var sq = await _speciesRepository.WithDetailsAsync(x => x.Forms);
        var speciesById = (await AsyncExecuter.ToListAsync(sq.Where(s => speciesIds.Contains(s.Id))))
            .ToDictionary(s => s.Id);

        var rewardIds = journeys.SelectMany(j => j.Backpack).Select(b => b.RewardItemId).Distinct().ToList();
        var rewardsById = rewardIds.Count == 0
            ? new Dictionary<Guid, RewardItem>()
            : (await _rewardRepository.GetListAsync(r => rewardIds.Contains(r.Id))).ToDictionary(r => r.Id);

        var entries = new List<PkEntryDto>();
        foreach (var journey in journeys)
        {
            if (!children.TryGetValue(journey.ChildId, out var child))
            {
                continue;
            }

            // 本周完成度（纯读；休息日 total==0 不计入分母，未来日不在窗内）
            var days = await _generator.ReadRangeAsync(journey.ChildId, weekStart, today);
            var totalTasks = days.Sum(d => d.TasksTotal);
            var completedTasks = days.Sum(d => d.TasksCompleted);
            var pct = totalTasks > 0 ? (int)Math.Round((double)completedTasks / totalTasks * 100) : 0;
            var weeklyStars = days.Sum(d => StarCalculator.CalculateStars(d.TasksTotal, d.TasksCompleted));
            var streak = await _generator.CalculateStreakAsync(journey.ChildId, journey.StartDate);

            PetSpecies? species = journey.PetSpeciesId != null
                && speciesById.TryGetValue(journey.PetSpeciesId.Value, out var s) ? s : null;
            var form = species?.Forms.FirstOrDefault(f => f.Level == journey.CurrentLevel);

            var items = journey.Backpack
                .Where(b => b.Quantity > 0 && rewardsById.ContainsKey(b.RewardItemId))
                .Select(b =>
                {
                    var r = rewardsById[b.RewardItemId];
                    return new PkItemDto
                    {
                        RewardItemId = r.Id, Name = r.Name, Glyph = r.Glyph,
                        IconUrl = _urls.ToUrl(r.IconObjectKey), Quantity = b.Quantity,
                    };
                })
                .OrderByDescending(i => i.Quantity)
                .ToList();

            entries.Add(new PkEntryDto
            {
                ChildId = child.Id,
                DisplayName = child.DisplayName,
                AvatarKey = child.AvatarKey,
                PetSpeciesId = journey.PetSpeciesId ?? Guid.Empty,
                PetName = species?.Name ?? string.Empty,
                PetLevel = journey.CurrentLevel,
                PetSpriteUrl = _urls.ToUrl(form?.SpriteObjectKey),
                CompletionPercent = pct,
                CompletedTasks = completedTasks,
                TotalTasks = totalTasks,
                Streak = streak,
                WeeklyStars = weeklyStars,
                Items = items,
            });
        }

        // 排名：完成度 → 连击 → 本周星星 → 名字（稳定、无并列歧义）
        var ranked = entries
            .OrderByDescending(e => e.CompletionPercent)
            .ThenByDescending(e => e.Streak)
            .ThenByDescending(e => e.WeeklyStars)
            .ThenBy(e => e.DisplayName, StringComparer.Ordinal)
            .ToList();
        for (var i = 0; i < ranked.Count; i++)
        {
            ranked[i].Rank = i + 1;
        }

        result.Entries = ranked;
        return result;
    }
}
