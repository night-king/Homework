using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Journeys;
using Homework.Permissions;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Tasks;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class JourneyTaskTemplateAppService : HomeworkAppService, IJourneyTaskTemplateAppService
{
    private readonly IRepository<JourneyTaskTemplateItem, Guid> _repository;
    private readonly IRepository<Journey, Guid> _journeyRepository;
    private readonly ChildProfileManager _childManager;

    public JourneyTaskTemplateAppService(
        IRepository<JourneyTaskTemplateItem, Guid> repository,
        IRepository<Journey, Guid> journeyRepository,
        ChildProfileManager childManager)
    {
        _repository = repository;
        _journeyRepository = journeyRepository;
        _childManager = childManager;
    }

    public async Task<ListResultDto<JourneyTaskTemplateItemDto>> GetListAsync(GetJourneyTemplateInput input)
    {
        await EnsureJourneyOwnedAsync(input.JourneyId);
        var journeyId = input.JourneyId;
        var dow = input.DayOfWeek;
        var items = await _repository.GetListAsync(t => t.JourneyId == journeyId && (dow == null || t.DayOfWeek == dow));
        var dtos = items.OrderBy(t => t.DayOfWeek).ThenBy(t => t.Order)
            .Select(t => ObjectMapper.Map<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>(t)).ToList();
        return new ListResultDto<JourneyTaskTemplateItemDto>(dtos);
    }

    public async Task<JourneyTaskTemplateItemDto> CreateAsync(CreateJourneyTaskTemplateItemDto input)
    {
        await EnsureJourneyOwnedAsync(input.JourneyId);
        var item = new JourneyTaskTemplateItem(GuidGenerator.Create(), input.JourneyId, input.DayOfWeek,
            input.Title, input.Subject, input.Order, input.EstimatedMinutes);
        item.SetReward(input.RewardItemId, input.RewardIsRandom);
        await _repository.InsertAsync(item, autoSave: true);
        return ObjectMapper.Map<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>(item);
    }

    public async Task<JourneyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateJourneyTaskTemplateItemDto input)
    {
        var item = await _repository.GetAsync(id);
        await EnsureJourneyOwnedAsync(item.JourneyId);
        item.SetTitle(input.Title);
        item.SetSubject(input.Subject);
        item.SetOrder(input.Order);
        item.SetEstimatedMinutes(input.EstimatedMinutes);
        if (input.IsActive) { item.Activate(); } else { item.Deactivate(); }
        item.SetReward(input.RewardItemId, input.RewardIsRandom);
        await _repository.UpdateAsync(item, autoSave: true);
        return ObjectMapper.Map<JourneyTaskTemplateItem, JourneyTaskTemplateItemDto>(item);
    }

    public async Task DeleteAsync(Guid id)
    {
        var item = await _repository.GetAsync(id);
        await EnsureJourneyOwnedAsync(item.JourneyId);
        await _repository.DeleteAsync(item);
    }

    private async Task EnsureJourneyOwnedAsync(Guid journeyId)
    {
        var journey = await _journeyRepository.GetAsync(journeyId);
        await _childManager.EnsureChildOwnedAsync(journey.ChildId);
    }
}
