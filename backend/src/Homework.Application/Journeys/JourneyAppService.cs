using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Journeys.Dtos;
using Homework.Permissions;
using Homework.Tasks;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Users;

namespace Homework.Journeys;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class JourneyAppService : HomeworkAppService, IJourneyAppService
{
    private readonly IRepository<Journey, Guid> _repository;
    private readonly IRepository<DailyTask, Guid> _taskRepository;
    private readonly ChildProfileManager _childManager;

    public JourneyAppService(IRepository<Journey, Guid> repository,
        IRepository<DailyTask, Guid> taskRepository, ChildProfileManager childManager)
    {
        _repository = repository;
        _taskRepository = taskRepository;
        _childManager = childManager;
    }

    public async Task<ListResultDto<JourneyDto>> GetListAsync(GetJourneyListInput input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var childId = input.ChildId;
        var items = await _repository.GetListAsync(j => j.ChildId == childId);
        var dtos = items.OrderByDescending(j => j.StartDate)
            .Select(j => ObjectMapper.Map<Journey, JourneyDto>(j)).ToList();
        return new ListResultDto<JourneyDto>(dtos);
    }

    public async Task<JourneyDto> GetAsync(Guid id) => ObjectMapper.Map<Journey, JourneyDto>(await GetOwnedAsync(id));

    public async Task DeleteAsync(Guid id)
    {
        var journey = await GetOwnedAsync(id);
        // 模板不再按 JourneyId 走——它们挂在 SharedJourney 上，归共享计划删除时清理，删单份旅程不该碰。
        // 已生成的每日任务要清：看板按 childId + date 查，留下的话会返回指向已删除旅程的
        // 任务，还占住那些日期让新旅程生成不出任务。
        await _taskRepository.DeleteAsync(t => t.JourneyId == id, autoSave: true);
        await _repository.DeleteAsync(journey, autoSave: true);
    }

    private async Task<Journey> GetOwnedAsync(Guid id)
    {
        var journey = await _repository.GetAsync(id);
        await _childManager.EnsureChildOwnedAsync(journey.ChildId);
        return journey;
    }
}
