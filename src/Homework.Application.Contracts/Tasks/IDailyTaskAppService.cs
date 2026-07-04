using System;
using System.Threading.Tasks;
using Homework.Tasks.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Tasks;

public interface IDailyTaskAppService : IApplicationService
{
    Task<DailyBoardDto> GetBoardAsync(GetDailyBoardInput input);
    Task<DailyTaskDto> CreateAsync(CreateDailyTaskDto input);
    Task<DailyTaskDto> UpdateAsync(Guid id, UpdateDailyTaskDto input);
    Task DeleteAsync(Guid id);
    Task RevokeAsync(Guid id);
    Task RestoreAsync(Guid id);
}
