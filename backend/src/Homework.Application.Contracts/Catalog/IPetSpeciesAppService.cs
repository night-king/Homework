using System;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Content;

namespace Homework.Catalog;

public interface IPetSpeciesAppService : IApplicationService
{
    Task<ListResultDto<PetSpeciesDto>> GetListAsync();
    Task<ListResultDto<PetSpeciesDto>> GetActiveListAsync();
    Task<PetSpeciesDto> GetAsync(Guid id);
    Task<PetSpeciesDto> CreateAsync(CreateUpdatePetSpeciesDto input);
    Task<PetSpeciesDto> UpdateAsync(Guid id, CreateUpdatePetSpeciesDto input);
    Task DeleteAsync(Guid id);
    Task<PetSpeciesDto> SetFormAsync(Guid id, SetPetFormDto input);
    Task<PetSpeciesDto> UploadCoverAsync(Guid id, IRemoteStreamContent file);
    Task<PetSpeciesDto> UploadFormSpriteAsync(Guid id, int level, IRemoteStreamContent file);
    Task<PetSpeciesDto> UploadFormEvolveVideoAsync(Guid id, int level, IRemoteStreamContent file);
    Task<PetSpeciesDto> ActivateAsync(Guid id);
    Task<PetSpeciesDto> DeactivateAsync(Guid id);
}
