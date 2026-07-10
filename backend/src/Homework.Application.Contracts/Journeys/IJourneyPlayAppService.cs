using System;
using System.Threading.Tasks;
using Homework.Journeys.Dtos;
using Homework.Tasks.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Journeys;

public interface IJourneyPlayAppService : IApplicationService
{
    Task<JourneyDto?> GetActiveAsync(Guid childId);
    Task<JourneyDto> StartAsync(StartJourneyDto input);
    Task<DailyBoardDto> GetDailyBoardAsync(GetDailyBoardInput input);
    Task<ListResultDto<BackpackItemDto>> GetBackpackAsync(Guid childId, Guid journeyId);
    Task<ListResultDto<CollectionEntryDto>> GetCollectionAsync(Guid childId);
}
