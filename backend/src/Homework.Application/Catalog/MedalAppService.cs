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
public class MedalAppService : HomeworkAppService, IMedalAppService
{
    private readonly IRepository<Medal, Guid> _repository;
    private readonly IAssetUrlResolver _urls;
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public MedalAppService(
        IRepository<Medal, Guid> repository,
        IAssetUrlResolver urls,
        IBlobContainer<CatalogBlobContainer> blob)
    {
        _repository = repository;
        _urls = urls;
        _blob = blob;
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<ListResultDto<MedalDto>> GetListAsync()
    {
        var items = await _repository.GetListAsync();
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    public async Task<ListResultDto<MedalDto>> GetActiveListAsync()
    {
        var items = await _repository.GetListAsync(i => i.IsActive);
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> GetAsync(Guid id) => ToDto(await _repository.GetAsync(id));

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> CreateAsync(CreateUpdateMedalDto input)
    {
        var medal = new Medal(GuidGenerator.Create(), input.Name);
        medal.SetDescription(input.Description);
        medal.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { medal.Activate(); }
        await _repository.InsertAsync(medal, autoSave: true);
        return ToDto(medal);
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> UpdateAsync(Guid id, CreateUpdateMedalDto input)
    {
        var medal = await _repository.GetAsync(id);
        medal.SetName(input.Name);
        medal.SetDescription(input.Description);
        medal.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { medal.Activate(); } else { medal.Deactivate(); }
        await _repository.UpdateAsync(medal, autoSave: true);
        return ToDto(medal);
    }

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task DeleteAsync(Guid id) => await _repository.DeleteAsync(id);

    [Authorize(HomeworkPermissions.Catalog.Medals)]
    public async Task<MedalDto> UploadImageAsync(Guid id, IRemoteStreamContent file)
    {
        var medal = await _repository.GetAsync(id);
        var ext = Path.GetExtension(file.FileName) ?? string.Empty;
        var objectKey = $"medals/{id:N}{ext}";
        await using (var stream = file.GetStream())
        {
            await _blob.SaveAsync(objectKey, stream, overrideExisting: true);
        }
        medal.SetImage(objectKey);
        await _repository.UpdateAsync(medal, autoSave: true);
        return ToDto(medal);
    }

    private ListResultDto<MedalDto> List(IEnumerable<Medal> items) => new(items.Select(ToDto).ToList());

    private MedalDto ToDto(Medal medal)
    {
        var dto = ObjectMapper.Map<Medal, MedalDto>(medal);
        dto.ImageUrl = _urls.ToUrl(medal.ImageObjectKey);
        return dto;
    }
}
