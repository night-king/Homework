using System;
using System.Threading.Tasks;
using Homework.Tasks.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Tasks;

public interface IWeeklyTaskTemplateAppService : IApplicationService
{
    Task<ListResultDto<WeeklyTaskTemplateItemDto>> GetListAsync(GetWeeklyTemplateInput input);
    Task<WeeklyTaskTemplateItemDto> CreateAsync(CreateWeeklyTaskTemplateItemDto input);
    Task<WeeklyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateWeeklyTaskTemplateItemDto input);
    Task DeleteAsync(Guid id);
}
