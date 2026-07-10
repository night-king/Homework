using System;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Content;

namespace Homework.Catalog;

public interface IRewardItemAppService : IApplicationService
{
    Task<ListResultDto<RewardItemDto>> GetListAsync();
    Task<ListResultDto<RewardItemDto>> GetActiveListAsync();
    Task<RewardItemDto> GetAsync(Guid id);
    Task<RewardItemDto> CreateAsync(CreateUpdateRewardItemDto input);
    Task<RewardItemDto> UpdateAsync(Guid id, CreateUpdateRewardItemDto input);
    Task DeleteAsync(Guid id);
    Task<RewardItemDto> UploadIconAsync(Guid id, IRemoteStreamContent file);
}
