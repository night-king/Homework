using System;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

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
}
