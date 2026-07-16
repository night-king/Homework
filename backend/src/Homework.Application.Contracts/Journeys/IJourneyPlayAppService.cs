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
    Task<WeekStripDto> GetWeekStripAsync(GetWeekStripInput input);
    Task<ListResultDto<BackpackItemDto>> GetBackpackAsync(Guid childId, Guid journeyId);
    Task<ListResultDto<CollectionEntryDto>> GetCollectionAsync(Guid childId);
    Task<DailyTaskDto> CompleteTaskAsync(Guid childId, Guid taskId);
    Task<DailyTaskDto> UncompleteTaskAsync(Guid childId, Guid taskId);
    Task<FeedResultDto> FeedAsync(FeedDto input);
}
