using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.BlobStoring;
using Volo.Abp.Content;
using Volo.Abp.Domain.Repositories;

namespace Homework.Catalog;

[Authorize]
public class PetSpeciesAppService : HomeworkAppService, IPetSpeciesAppService
{
    private readonly IRepository<PetSpecies, Guid> _repository;
    private readonly IAssetUrlResolver _urls;
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public PetSpeciesAppService(
        IRepository<PetSpecies, Guid> repository,
        IAssetUrlResolver urls,
        IBlobContainer<CatalogBlobContainer> blob)
    {
        _repository = repository;
        _urls = urls;
        _blob = blob;
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<ListResultDto<PetSpeciesDto>> GetListAsync()
    {
        var q = await _repository.WithDetailsAsync(x => x.Forms);
        var items = await AsyncExecuter.ToListAsync(q.OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name));
        return new ListResultDto<PetSpeciesDto>(items.Select(ToDto).ToList());
    }

    public async Task<ListResultDto<PetSpeciesDto>> GetActiveListAsync()
    {
        var q = await _repository.WithDetailsAsync(x => x.Forms);
        var items = await AsyncExecuter.ToListAsync(
            q.Where(x => x.IsActive).OrderBy(x => x.DisplayOrder).ThenBy(x => x.Name));
        return new ListResultDto<PetSpeciesDto>(items.Select(ToDto).ToList());
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> GetAsync(Guid id) => ToDto(await GetWithFormsAsync(id));

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> CreateAsync(CreateUpdatePetSpeciesDto input)
    {
        var species = new PetSpecies(GuidGenerator.Create(), input.Name, input.Code);
        species.SetAccentColor(input.AccentColor);
        species.SetDescription(input.Description);
        species.SetDisplayOrder(input.DisplayOrder);
        await _repository.InsertAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UpdateAsync(Guid id, CreateUpdatePetSpeciesDto input)
    {
        var species = await GetWithFormsAsync(id);
        species.SetName(input.Name);
        species.SetCode(input.Code);
        species.SetAccentColor(input.AccentColor);
        species.SetDescription(input.Description);
        species.SetDisplayOrder(input.DisplayOrder);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task DeleteAsync(Guid id) => await _repository.DeleteAsync(id);

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> SetFormAsync(Guid id, SetPetFormDto input)
    {
        var species = await GetWithFormsAsync(id);
        species.SetForm(input.Level, input.Name, input.RevealText, input.GrowthToNext, input.Scale);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UploadCoverAsync(Guid id, IRemoteStreamContent file)
    {
        var species = await GetWithFormsAsync(id);
        var key = $"pets/{id:N}/cover{Path.GetExtension(file.FileName)}";
        await SaveAsync(key, file);
        species.SetCover(key);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UploadFormSpriteAsync(Guid id, int level, IRemoteStreamContent file)
    {
        var species = await GetWithFormsAsync(id);
        var key = $"pets/{id:N}/form-{level}{Path.GetExtension(file.FileName)}";
        await SaveAsync(key, file);
        species.SetFormSprite(level, key);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> UploadFormEvolveVideoAsync(Guid id, int level, IRemoteStreamContent file)
    {
        var species = await GetWithFormsAsync(id);
        var key = $"pets/{id:N}/evolve-{level}-{level + 1}{Path.GetExtension(file.FileName)}";
        await SaveAsync(key, file);
        species.SetFormEvolveVideo(level, key);
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> ActivateAsync(Guid id)
    {
        var species = await GetWithFormsAsync(id);
        species.Activate();
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    [Authorize(HomeworkPermissions.Catalog.Pets)]
    public async Task<PetSpeciesDto> DeactivateAsync(Guid id)
    {
        var species = await GetWithFormsAsync(id);
        species.Deactivate();
        await _repository.UpdateAsync(species, autoSave: true);
        return ToDto(species);
    }

    private async Task SaveAsync(string objectKey, IRemoteStreamContent file)
    {
        await using var stream = file.GetStream();
        await _blob.SaveAsync(objectKey, stream, overrideExisting: true);
    }

    private async Task<PetSpecies> GetWithFormsAsync(Guid id)
    {
        var q = await _repository.WithDetailsAsync(x => x.Forms);
        var species = await AsyncExecuter.FirstOrDefaultAsync(q.Where(x => x.Id == id));
        if (species == null)
        {
            throw new Volo.Abp.Domain.Entities.EntityNotFoundException(typeof(PetSpecies), id);
        }

        return species;
    }

    private PetSpeciesDto ToDto(PetSpecies species)
    {
        var dto = ObjectMapper.Map<PetSpecies, PetSpeciesDto>(species);
        dto.CoverUrl = _urls.ToUrl(species.CoverObjectKey);
        dto.Forms = species.Forms
            .OrderBy(f => f.Level)
            .Select(f => new PetFormDto
            {
                Level = f.Level,
                Name = f.Name,
                SpriteUrl = _urls.ToUrl(f.SpriteObjectKey),
                RevealText = f.RevealText,
                GrowthToNext = f.GrowthToNext,
                EvolveVideoUrl = _urls.ToUrl(f.EvolveVideoObjectKey),
                Scale = f.Scale,
            })
            .ToList();
        return dto;
    }
}
