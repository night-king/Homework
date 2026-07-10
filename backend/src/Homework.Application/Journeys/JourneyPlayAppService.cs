using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Children;
using Homework.Journeys.Dtos;
using Homework.Permissions;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Timing;
using StarCalc = Homework.Scoring.StarCalculator;

namespace Homework.Journeys;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class JourneyPlayAppService : HomeworkAppService, IJourneyPlayAppService
{
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly IRepository<DailyTask, Guid> _dailyTaskRepository;
    private readonly IRepository<RewardItem, Guid> _rewardRepository;
    private readonly IRepository<Medal, Guid> _medalRepository;
    private readonly IRepository<PetSpecies, Guid> _speciesRepository;
    private readonly JourneyManager _journeyManager;
    private readonly DailyTaskGenerator _generator;
    private readonly ChildProfileManager _childManager;
    private readonly IAssetUrlResolver _urls;
    private readonly IClock _clock;

    public JourneyPlayAppService(
        IRepository<Journey, Guid> journeyRepository,
        IRepository<DailyTask, Guid> dailyTaskRepository,
        IRepository<RewardItem, Guid> rewardRepository,
        IRepository<Medal, Guid> medalRepository,
        IRepository<PetSpecies, Guid> speciesRepository,
        JourneyManager journeyManager,
        DailyTaskGenerator generator,
        ChildProfileManager childManager,
        IAssetUrlResolver urls,
        IClock clock)
    {
        _journeyRepository = journeyRepository;
        _dailyTaskRepository = dailyTaskRepository;
        _rewardRepository = rewardRepository;
        _medalRepository = medalRepository;
        _speciesRepository = speciesRepository;
        _journeyManager = journeyManager;
        _generator = generator;
        _childManager = childManager;
        _urls = urls;
        _clock = clock;
    }

    public async Task<JourneyDto?> GetActiveAsync(Guid childId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == childId && j.Status == JourneyStatus.Active);
        return journey == null ? null : ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task<JourneyDto> StartAsync(StartJourneyDto input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var journey = await _journeyRepository.GetAsync(input.JourneyId);
        if (journey.ChildId != input.ChildId)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(Journey), input.JourneyId);
        }

        await _journeyManager.StartAsync(journey, input.PetSpeciesId);
        await _journeyRepository.UpdateAsync(journey, autoSave: true);
        return ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task<DailyBoardDto> GetDailyBoardAsync(GetDailyBoardInput input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        await _generator.EnsureDayAsync(input.ChildId, input.Date);
        await _generator.SettleDayAsync(input.ChildId, input.Date);

        var childId = input.ChildId;
        var date = input.Date;
        var tasks = (await _dailyTaskRepository.GetListAsync(t => t.ChildId == childId && t.Date == date))
            .OrderBy(t => t.Order).ToList();
        var total = tasks.Count;
        var completed = tasks.Count(t => t.CountsAsCompleted);

        return new DailyBoardDto
        {
            ChildId = childId,
            Date = date,
            Tasks = tasks.Select(t => ObjectMapper.Map<DailyTask, DailyTaskDto>(t)).ToList(),
            TasksTotal = total,
            TasksCompleted = completed,
            Stars = StarCalc.CalculateStars(total, completed),
            IsFull = total > 0 && completed == total,
            IsRestDay = total == 0,
        };
    }

    public async Task<ListResultDto<BackpackItemDto>> GetBackpackAsync(Guid childId, Guid journeyId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == journeyId && x.ChildId == childId))
            ?? throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(Journey), journeyId);

        var ids = journey.Backpack.Select(b => b.RewardItemId).ToList();
        var items = await _rewardRepository.GetListAsync(r => ids.Contains(r.Id));
        var byId = items.ToDictionary(r => r.Id);

        var dtos = journey.Backpack
            .Where(b => byId.ContainsKey(b.RewardItemId) && b.Quantity > 0)
            .Select(b =>
            {
                var r = byId[b.RewardItemId];
                return new BackpackItemDto
                {
                    RewardItemId = r.Id, Name = r.Name, Glyph = r.Glyph,
                    IconUrl = _urls.ToUrl(r.IconObjectKey), Quantity = b.Quantity, GrowthValue = r.GrowthValue,
                };
            }).ToList();
        return new ListResultDto<BackpackItemDto>(dtos);
    }

    public async Task<ListResultDto<CollectionEntryDto>> GetCollectionAsync(Guid childId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var completed = (await _journeyRepository.GetListAsync(
                j => j.ChildId == childId && j.Status == JourneyStatus.Completed))
            .OrderByDescending(j => j.CompletedTime).ToList();

        var speciesIds = completed.Where(j => j.PetSpeciesId != null).Select(j => j.PetSpeciesId!.Value).Distinct().ToList();
        var medalIds = completed.Select(j => j.MedalId).Distinct().ToList();
        var speciesQ = await _speciesRepository.WithDetailsAsync(x => x.Forms);
        var speciesList = await AsyncExecuter.ToListAsync(speciesQ.Where(x => speciesIds.Contains(x.Id)));
        var speciesById = speciesList.ToDictionary(s => s.Id);
        var medals = await _medalRepository.GetListAsync(m => medalIds.Contains(m.Id));
        var medalById = medals.ToDictionary(m => m.Id);

        var dtos = new List<CollectionEntryDto>();
        foreach (var j in completed)
        {
            var species = j.PetSpeciesId != null && speciesById.TryGetValue(j.PetSpeciesId.Value, out var s) ? s : null;
            var finalForm = species?.Forms.FirstOrDefault(f => f.Level == PetSpecies.FormCount);
            var medal = medalById.TryGetValue(j.MedalId, out var m) ? m : null;
            dtos.Add(new CollectionEntryDto
            {
                JourneyId = j.Id, Title = j.Title,
                PetSpeciesId = j.PetSpeciesId ?? Guid.Empty,
                PetName = species?.Name ?? string.Empty,
                PetFinalSpriteUrl = _urls.ToUrl(finalForm?.SpriteObjectKey),
                MedalId = j.MedalId, MedalName = medal?.Name ?? string.Empty,
                MedalImageUrl = _urls.ToUrl(medal?.ImageObjectKey),
                CompletedTime = j.CompletedTime ?? default,
            });
        }
        return new ListResultDto<CollectionEntryDto>(dtos);
    }

    public async Task<DailyTaskDto> CompleteTaskAsync(Guid childId, Guid taskId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var task = await _dailyTaskRepository.GetAsync(taskId);
        if (task.ChildId != childId)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(DailyTask), taskId);
        }

        task.Complete(_clock.Now);
        await _dailyTaskRepository.UpdateAsync(task, autoSave: true);
        await GrantRewardIfNeededAsync(task);
        await _dailyTaskRepository.UpdateAsync(task, autoSave: true); // persist RewardGranted flag
        await _generator.SettleDayAsync(childId, task.Date);
        return ObjectMapper.Map<DailyTask, DailyTaskDto>(task);
    }

    public async Task<DailyTaskDto> UncompleteTaskAsync(Guid childId, Guid taskId)
    {
        await _childManager.EnsureChildOwnedAsync(childId);
        var task = await _dailyTaskRepository.GetAsync(taskId);
        if (task.ChildId != childId)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(DailyTask), taskId);
        }

        task.Uncomplete();
        await ClawBackRewardIfNeededAsync(task);
        await _dailyTaskRepository.UpdateAsync(task, autoSave: true);
        await _generator.SettleDayAsync(childId, task.Date);
        return ObjectMapper.Map<DailyTask, DailyTaskDto>(task);
    }

    public async Task<FeedResultDto> FeedAsync(FeedDto input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack, x => x.Stages);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == input.JourneyId && x.ChildId == input.ChildId))
            ?? throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(Journey), input.JourneyId);

        var reward = await _rewardRepository.GetAsync(input.RewardItemId);
        var result = journey.Feed(input.RewardItemId, reward.GrowthValue, _clock.Now);
        await _journeyRepository.UpdateAsync(journey, autoSave: true);

        var dto = new FeedResultDto
        {
            Evolved = result.Evolved, NewLevel = result.NewLevel, Completed = result.Completed,
            CurrentLevel = journey.CurrentLevel, GrowthPoints = journey.GrowthPoints,
        };

        if (result.Evolved && journey.PetSpeciesId is Guid speciesId)
        {
            var sq = await _speciesRepository.WithDetailsAsync(x => x.Forms);
            var species = await AsyncExecuter.FirstOrDefaultAsync(sq.Where(x => x.Id == speciesId));
            var arriving = species?.Forms.FirstOrDefault(f => f.Level == result.NewLevel);
            var leaving = species?.Forms.FirstOrDefault(f => f.Level == result.NewLevel - 1);
            dto.RevealText = arriving?.RevealText;
            dto.EvolveVideoUrl = _urls.ToUrl(leaving?.EvolveVideoObjectKey);
        }

        return dto;
    }

    private async Task GrantRewardIfNeededAsync(DailyTask task)
    {
        if (task.RewardItemId is not Guid rewardItemId || task.RewardGranted || !task.CountsAsCompleted)
        {
            return;
        }

        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == task.JourneyId));
        if (journey == null || journey.Status != JourneyStatus.Active)
        {
            return;
        }

        journey.GrantReward(rewardItemId);
        await _journeyRepository.UpdateAsync(journey, autoSave: true);
        task.MarkRewardGranted();
    }

    private async Task ClawBackRewardIfNeededAsync(DailyTask task)
    {
        if (task.RewardItemId is not Guid rewardItemId || !task.RewardGranted)
        {
            return;
        }

        var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
        var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == task.JourneyId));
        if (journey != null)
        {
            journey.RevokeReward(rewardItemId);
            await _journeyRepository.UpdateAsync(journey, autoSave: true);
        }

        task.ClearRewardGranted();
    }
}
