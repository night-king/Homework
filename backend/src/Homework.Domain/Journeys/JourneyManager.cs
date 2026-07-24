using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Entities;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace Homework.Journeys;

public class JourneyManager : DomainService
{
    /// <summary>目标完成度：喂完约这么多比例的「预期食物」即满级，让宠物差不多在旅程末尾进化完（约 85%）。</summary>
    private const double CompletionTarget = 0.85;

    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<PetSpecies, Guid> _petSpeciesRepository;
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepository;
    private readonly IRepository<RewardItem, Guid> _rewardRepository;

    public JourneyManager(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<PetSpecies, Guid> petSpeciesRepository,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepository,
        IRepository<RewardItem, Guid> rewardRepository)
    {
        _journeyRepository = journeyRepository;
        _petSpeciesRepository = petSpeciesRepository;
        _templateRepository = templateRepository;
        _rewardRepository = rewardRepository;
    }

    /// <summary>开始旅程：单旅程约束 + 按旅程计划缩放 5 阶阈值 + Journey.Start。</summary>
    public async Task StartAsync(Journey journey, Guid petSpeciesId)
    {
        var hasOtherActive = await _journeyRepository.AnyAsync(
            j => j.ChildId == journey.ChildId && j.Status == JourneyStatus.Active && j.Id != journey.Id);
        if (hasOtherActive)
        {
            throw new BusinessException(HomeworkDomainErrorCodes.JourneyAlreadyHasActive);
        }

        var q = await _petSpeciesRepository.WithDetailsAsync(x => x.Forms);
        var species = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == petSpeciesId))
            ?? throw new EntityNotFoundException(typeof(PetSpecies), petSpeciesId);

        var stages = await ComputeStagesAsync(journey, species);
        journey.Start(petSpeciesId, stages);
    }

    /// <summary>
    /// 计算快照到旅程的 5 阶阈值。
    /// 当该旅程已排出「计划食物量」且有启用的奖励道具时，按计划<b>自动缩放</b>：
    /// 让喂完约 <see cref="CompletionTarget"/> 比例的预期食物即满级（宠物差不多在旅程末尾进化完），
    /// 并保持宠物原有阶段比例（形状）。这样无论旅程多长、每天几个任务、食物成长值多大都能自适应
    /// —— 食物成长值的绝对大小会被阈值一起缩放抵消，不再导致提前满级。
    /// 尚未排模板 / 没有启用奖励道具时回退到宠物静态阈值（保持旧行为）。
    /// </summary>
    private async Task<IEnumerable<(int Level, int? GrowthToNext)>> ComputeStagesAsync(Journey journey, PetSpecies species)
    {
        var staticStages = species.Forms.OrderBy(f => f.Level)
            .Select(f => (f.Level, f.GrowthToNext)).ToList();

        var expectedFoods = await ComputeExpectedFoodCountAsync(journey);
        if (expectedFoods <= 0)
        {
            return staticStages;   // 还没排计划 → 保持静态阈值
        }

        var avgGrowth = await ComputeAverageFoodGrowthAsync();
        if (avgGrowth <= 0)
        {
            return staticStages;   // 没有启用的奖励道具 → 保持静态阈值
        }

        var budget = (int)Math.Round(CompletionTarget * expectedFoods * avgGrowth, MidpointRounding.AwayFromZero);
        var gaps = staticStages.Where(s => s.GrowthToNext is int g && g > 0).ToList();
        var shapeSum = gaps.Sum(s => (double)s.GrowthToNext!.Value);
        if (budget <= 0 || gaps.Count == 0 || shapeSum <= 0)
        {
            return staticStages;   // 宠物阶段比例缺失（异常配置）→ 保持静态
        }

        // 按宠物原有阶段比例把总预算摊到各阶（满阶 GrowthToNext 恒为 null）；每阶至少 1，避免 0 阈值秒进化。
        return staticStages.Select(s =>
            s.GrowthToNext is int v && v > 0
                ? (s.Level, (int?)Math.Max(1, (int)Math.Round(budget * v / shapeSum, MidpointRounding.AwayFromZero)))
                : (s.Level, s.GrowthToNext)).ToList();
    }

    /// <summary>旅程区间内会产出的食物总数 = 各工作日的活跃模板数 × 该工作日在 [StartDate, EndDate] 内出现次数。</summary>
    private async Task<int> ComputeExpectedFoodCountAsync(Journey journey)
    {
        var sharedJourneyId = journey.SharedJourneyId;
        var templates = await _templateRepository.GetListAsync(t => t.SharedJourneyId == sharedJourneyId && t.IsActive);
        if (templates.Count == 0)
        {
            return 0;
        }

        var countByDow = templates.GroupBy(t => t.DayOfWeek).ToDictionary(g => g.Key, g => g.Count());
        var total = 0;
        for (var date = journey.StartDate; date <= journey.EndDate; date = date.AddDays(1))
        {
            if (countByDow.TryGetValue(date.DayOfWeek, out var count))
            {
                total += count;
            }
        }

        return total;
    }

    /// <summary>启用奖励道具的平均食物成长值（随机池按 RandomWeight 加权；权重全 0 时取简单平均）。</summary>
    private async Task<double> ComputeAverageFoodGrowthAsync()
    {
        var rewards = await _rewardRepository.GetListAsync(r => r.IsActive);
        if (rewards.Count == 0)
        {
            return 0;
        }

        var totalWeight = rewards.Sum(r => (double)r.RandomWeight);
        if (totalWeight <= 0)
        {
            return rewards.Average(r => (double)r.GrowthValue);
        }

        return rewards.Sum(r => r.GrowthValue * (double)r.RandomWeight) / totalWeight;
    }
}
