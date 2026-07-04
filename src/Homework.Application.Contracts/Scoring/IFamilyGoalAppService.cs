using System;
using System.Threading.Tasks;
using Homework.Scoring.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Scoring;

public interface IFamilyGoalAppService : IApplicationService
{
    Task<ListResultDto<FamilyGoalDto>> GetListAsync();
    Task<FamilyGoalDto> GetAsync(Guid id);
    Task<FamilyGoalDto> CreateAsync(CreateUpdateFamilyGoalDto input);
    Task<FamilyGoalDto> UpdateAsync(Guid id, CreateUpdateFamilyGoalDto input);
    Task DeleteAsync(Guid id);
}
