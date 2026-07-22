using System;
using System.Threading.Tasks;
using Homework.Children.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace Homework.Children;

public interface IChildProfileAppService : IApplicationService
{
    Task<ListResultDto<ChildProfileDto>> GetListAsync();
    Task<ChildProfileDto> GetAsync(Guid id);
    Task<ChildProfileDto> CreateAsync(CreateChildDto input);
    Task<ChildProfileDto> UpdateAsync(Guid id, UpdateChildProfileDto input);
    Task SetPinAsync(Guid id, SetChildPinDto input);
    Task<bool> VerifyPinAsync(Guid id, VerifyChildPinDto input);
    Task DeleteAsync(Guid id);
}
