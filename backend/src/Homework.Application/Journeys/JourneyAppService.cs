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
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _templateRepository;
    private readonly IRepository<DailyTask, Guid> _taskRepository;
    private readonly ChildProfileManager _childManager;

    public JourneyAppService(IRepository<Journey, Guid> repository,
        IRepository<JourneyTaskTemplateItem, Guid> templateRepository,
        IRepository<DailyTask, Guid> taskRepository, ChildProfileManager childManager)
    {
        _repository = repository;
        _templateRepository = templateRepository;
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

    public async Task<JourneyDto> CreateAsync(CreateJourneyDto input)
    {
        await _childManager.EnsureChildOwnedAsync(input.ChildId);
        var journey = new Journey(GuidGenerator.Create(), CurrentUser.GetId(), input.ChildId,
            input.Title, input.StartDate, input.EndDate, input.MedalId);
        journey.SetDescription(input.Description);
        await _repository.InsertAsync(journey, autoSave: true);
        return ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task<JourneyDto> UpdateAsync(Guid id, UpdateJourneyDto input)
    {
        var journey = await GetOwnedAsync(id);
        journey.SetTitle(input.Title);
        journey.SetDescription(input.Description);
        journey.SetPeriod(input.StartDate, input.EndDate);
        journey.SetMedal(input.MedalId);
        await _repository.UpdateAsync(journey, autoSave: true);
        return ObjectMapper.Map<Journey, JourneyDto>(journey);
    }

    public async Task DeleteAsync(Guid id)
    {
        var journey = await GetOwnedAsync(id);
        await _templateRepository.DeleteAsync(t => t.JourneyId == id, autoSave: true);
        // 已生成的每日任务也要走：看板按 childId + date 查，留下的话会返回指向已删除旅程的
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
