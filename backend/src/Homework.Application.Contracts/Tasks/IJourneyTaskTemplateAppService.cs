using System;
using System.Threading.Tasks;
using Homework.Tasks.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Tasks;

public interface IJourneyTaskTemplateAppService : IApplicationService
{
    Task<ListResultDto<JourneyTaskTemplateItemDto>> GetListAsync(GetJourneyTemplateInput input);
    Task<JourneyTaskTemplateItemDto> CreateAsync(CreateJourneyTaskTemplateItemDto input);
    Task<JourneyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateJourneyTaskTemplateItemDto input);
    Task DeleteAsync(Guid id);
}
