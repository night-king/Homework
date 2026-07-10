using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Journeys;
using Homework.Permissions;
using Homework.Scoring;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Domain.Repositories;

namespace Homework.Tasks;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class DailyTaskAppService : HomeworkAppService, IDailyTaskAppService
{
    private readonly IRepository<DailyTask, Guid> _repository;
    private readonly DailyTaskGenerator _generator;
    private readonly ChildProfileManager _manager;
    private readonly IRepository<Journey, Guid> _journeyRepository;

    public DailyTaskAppService(
        IRepository<DailyTask, Guid> repository,
        DailyTaskGenerator generator,
        ChildProfileManager manager,
        IRepository<Journey, Guid> journeyRepository)
    {
        _repository = repository;
        _generator = generator;
        _manager = manager;
        _journeyRepository = journeyRepository;
    }

    public async Task<DailyBoardDto> GetBoardAsync(GetDailyBoardInput input)
    {
        await _manager.EnsureChildOwnedAsync(input.ChildId);
        await _generator.EnsureDayAsync(input.ChildId, input.Date); // lazy-generate
        await _generator.SettleDayAsync(input.ChildId, input.Date);  // settle-on-read (incl. today)

        var tasks = await _repository.GetListAsync(t => t.ChildId == input.ChildId && t.Date == input.Date);
        var total = tasks.Count;
        var completed = tasks.Count(t => t.CountsAsCompleted);
        return new DailyBoardDto
        {
            ChildId = input.ChildId,
            Date = input.Date,
            Tasks = tasks.OrderBy(t => t.Order).Select(t => ObjectMapper.Map<DailyTask, DailyTaskDto>(t)).ToList(),
            TasksTotal = total,
            TasksCompleted = completed,
            Stars = total == 0 ? 0 : StarCalculator.CalculateStars(total, completed),
            IsFull = total > 0 && completed == total,
            IsRestDay = total == 0
        };
    }

    public async Task<DailyTaskDto> CreateAsync(CreateDailyTaskDto input)
    {
        await _manager.EnsureChildOwnedAsync(input.ChildId);
        var journey = await _journeyRepository.FirstOrDefaultAsync(
            j => j.ChildId == input.ChildId && j.Status == JourneyStatus.Active)
            ?? throw new Volo.Abp.BusinessException(HomeworkDomainErrorCodes.JourneyNotActive);
        var task = new DailyTask(GuidGenerator.Create(), input.ChildId, journey.Id, input.Date, input.Title, input.Subject, input.Order);
        await _repository.InsertAsync(task, autoSave: true);
        await _generator.SettleDayAsync(input.ChildId, input.Date);
        return ObjectMapper.Map<DailyTask, DailyTaskDto>(task);
    }

    public async Task<DailyTaskDto> UpdateAsync(Guid id, UpdateDailyTaskDto input)
    {
        var task = await _repository.GetAsync(id);
        await _manager.EnsureChildOwnedAsync(task.ChildId);
        task.SetTitle(input.Title).SetSubject(input.Subject).SetOrder(input.Order);
        await _repository.UpdateAsync(task, autoSave: true);
        await _generator.SettleDayAsync(task.ChildId, task.Date);
        return ObjectMapper.Map<DailyTask, DailyTaskDto>(task);
    }

    public async Task DeleteAsync(Guid id)
    {
        var task = await _repository.GetAsync(id);
        await _manager.EnsureChildOwnedAsync(task.ChildId);
        await _repository.DeleteAsync(task, autoSave: true);
        await _generator.SettleDayAsync(task.ChildId, task.Date);
    }

    public Task RevokeAsync(Guid id) => ReviewAsync(id, revoke: true);
    public Task RestoreAsync(Guid id) => ReviewAsync(id, revoke: false);

    private async Task ReviewAsync(Guid id, bool revoke)
    {
        var task = await _repository.GetAsync(id);
        await _manager.EnsureChildOwnedAsync(task.ChildId);
        if (revoke)
        {
            task.Revoke();
            if (task.RewardGranted && task.RewardItemId is Guid revokeItemId)
            {
                var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
                var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == task.JourneyId));
                if (journey != null)
                {
                    journey.RevokeReward(revokeItemId);
                    await _journeyRepository.UpdateAsync(journey, autoSave: true);
                }

                task.ClearRewardGranted();
            }
        }
        else
        {
            task.Restore();
            if (task.CountsAsCompleted && task.RewardItemId is Guid restoreItemId && !task.RewardGranted)
            {
                var q = await _journeyRepository.WithDetailsAsync(x => x.Backpack);
                var journey = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == task.JourneyId));
                if (journey != null && journey.Status == JourneyStatus.Active)
                {
                    journey.GrantReward(restoreItemId);
                    await _journeyRepository.UpdateAsync(journey, autoSave: true);
                    task.MarkRewardGranted();
                }
            }
        }

        await _repository.UpdateAsync(task, autoSave: true);
        await _generator.SettleDayAsync(task.ChildId, task.Date);
    }
}
