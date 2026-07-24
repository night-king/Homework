using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Journeys.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;

namespace Homework.Journeys;

/// <summary>共享计划应用服务：CRUD + 参与者管理。业务规则（归属校验/删除保护/编辑同步）全落在 SharedJourneyManager。</summary>
[Authorize(HomeworkPermissions.ParentAdmin)]
public class SharedJourneyAppService : HomeworkAppService, ISharedJourneyAppService
{
    private readonly SharedJourneyManager _manager;

    public SharedJourneyAppService(SharedJourneyManager manager)
    {
        _manager = manager;
    }

    public async Task<SharedJourneyDto> CreateAsync(CreateUpdateSharedJourneyDto input)
    {
        var sharedJourney = await _manager.CreateAsync(
            input.Title, input.Description, input.StartDate, input.EndDate, input.MedalId);
        return ObjectMapper.Map<SharedJourney, SharedJourneyDto>(sharedJourney);
    }

    public async Task<SharedJourneyDto> UpdateAsync(Guid id, CreateUpdateSharedJourneyDto input)
    {
        var sharedJourney = await _manager.GetOwnedAsync(id);
        await _manager.UpdatePlanAsync(sharedJourney,
            input.Title, input.Description, input.StartDate, input.EndDate, input.MedalId);
        return ObjectMapper.Map<SharedJourney, SharedJourneyDto>(sharedJourney);
    }

    public Task DeleteAsync(Guid id) => _manager.DeleteAsync(id);

    public async Task<ListResultDto<SharedJourneyDto>> GetListAsync()
    {
        var items = await _manager.GetOwnedListAsync();
        var dtos = items.Select(s => ObjectMapper.Map<SharedJourney, SharedJourneyDto>(s)).ToList();
        return new ListResultDto<SharedJourneyDto>(dtos);
    }

    public async Task<SharedJourneyDto> GetAsync(Guid id) =>
        ObjectMapper.Map<SharedJourney, SharedJourneyDto>(await _manager.GetOwnedAsync(id));

    /// <summary>列出参与者：手工投影 (旅程, 孩子) 联结为 DTO（HasStarted = 非 Draft）。参数名 id → GET /{id}/participants。</summary>
    public async Task<ListResultDto<SharedJourneyParticipantDto>> GetParticipantsAsync(Guid id)
    {
        var participants = await _manager.GetParticipantsAsync(id);
        var dtos = participants.Select(p => new SharedJourneyParticipantDto
        {
            ChildId = p.Child.Id,
            DisplayName = p.Child.DisplayName,
            AvatarKey = p.Child.AvatarKey,
            Status = p.Journey.Status,
            HasStarted = p.Journey.Status != JourneyStatus.Draft,
        }).ToList();
        return new ListResultDto<SharedJourneyParticipantDto>(dtos);
    }

    public Task AddParticipantsAsync(AddParticipantsDto input) =>
        _manager.AddParticipantsAsync(input.SharedJourneyId, input.ChildIds);

    public Task RemoveParticipantAsync(Guid sharedJourneyId, Guid childId) =>
        _manager.RemoveParticipantAsync(sharedJourneyId, childId);
}
