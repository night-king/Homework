using System;
using System.Threading.Tasks;
using Homework.Journeys.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Journeys;

public interface IJourneyAppService : IApplicationService
{
    Task<ListResultDto<JourneyDto>> GetListAsync(GetJourneyListInput input);
    Task<JourneyDto> GetAsync(Guid id);
    Task DeleteAsync(Guid id);
}
