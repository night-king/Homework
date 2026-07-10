using System;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Content;

namespace Homework.Catalog;

public interface IMedalAppService : IApplicationService
{
    Task<ListResultDto<MedalDto>> GetListAsync();
    Task<ListResultDto<MedalDto>> GetActiveListAsync();
    Task<MedalDto> GetAsync(Guid id);
    Task<MedalDto> CreateAsync(CreateUpdateMedalDto input);
    Task<MedalDto> UpdateAsync(Guid id, CreateUpdateMedalDto input);
    Task DeleteAsync(Guid id);
    Task<MedalDto> UploadImageAsync(Guid id, IRemoteStreamContent file);
}
