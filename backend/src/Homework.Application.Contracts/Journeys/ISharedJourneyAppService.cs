using System;
using System.Threading.Tasks;
using Homework.Journeys.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Journeys;

public interface ISharedJourneyAppService : IApplicationService
{
    Task<SharedJourneyDto> CreateAsync(CreateUpdateSharedJourneyDto input);
    Task<SharedJourneyDto> UpdateAsync(Guid id, CreateUpdateSharedJourneyDto input);
    Task DeleteAsync(Guid id);
    Task<ListResultDto<SharedJourneyDto>> GetListAsync();
    Task<SharedJourneyDto> GetAsync(Guid id);
    Task AddParticipantsAsync(AddParticipantsDto input);
    Task RemoveParticipantAsync(Guid sharedJourneyId, Guid childId);
}
