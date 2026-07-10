using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Homework.Catalog;
using Homework.Catalog.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.BlobStoring;
using Volo.Abp.Content;
using Volo.Abp.Domain.Repositories;

namespace Homework.Catalog;

[Authorize]
public class RewardItemAppService : HomeworkAppService, IRewardItemAppService
{
    private readonly IRepository<RewardItem, Guid> _repository;
    private readonly IAssetUrlResolver _urls;
    private readonly IBlobContainer<CatalogBlobContainer> _blob;

    public RewardItemAppService(
        IRepository<RewardItem, Guid> repository,
        IAssetUrlResolver urls,
        IBlobContainer<CatalogBlobContainer> blob)
    {
        _repository = repository;
        _urls = urls;
        _blob = blob;
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<ListResultDto<RewardItemDto>> GetListAsync()
    {
        var items = await _repository.GetListAsync();
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    public async Task<ListResultDto<RewardItemDto>> GetActiveListAsync()
    {
        var items = await _repository.GetListAsync(i => i.IsActive);
        return List(items.OrderBy(i => i.DisplayOrder).ThenBy(i => i.Name));
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> GetAsync(Guid id) => ToDto(await _repository.GetAsync(id));

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> CreateAsync(CreateUpdateRewardItemDto input)
    {
        var item = new RewardItem(GuidGenerator.Create(), input.Name, input.GrowthValue, input.RandomWeight);
        item.SetGlyph(input.Glyph);
        item.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { item.Activate(); }
        await _repository.InsertAsync(item, autoSave: true);
        return ToDto(item);
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> UpdateAsync(Guid id, CreateUpdateRewardItemDto input)
    {
        var item = await _repository.GetAsync(id);
        item.SetName(input.Name);
        item.SetGrowthValue(input.GrowthValue);
        item.SetRandomWeight(input.RandomWeight);
        item.SetGlyph(input.Glyph);
        item.SetDisplayOrder(input.DisplayOrder);
        if (input.IsActive) { item.Activate(); } else { item.Deactivate(); }
        await _repository.UpdateAsync(item, autoSave: true);
        return ToDto(item);
    }

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task DeleteAsync(Guid id) => await _repository.DeleteAsync(id);

    [Authorize(HomeworkPermissions.Catalog.RewardItems)]
    public async Task<RewardItemDto> UploadIconAsync(Guid id, IRemoteStreamContent file)
    {
        var item = await _repository.GetAsync(id);
        var ext = Path.GetExtension(file.FileName) ?? string.Empty;
        var objectKey = $"rewards/{id:N}{ext}";
        await using (var stream = file.GetStream())
        {
            await _blob.SaveAsync(objectKey, stream, overrideExisting: true);
        }
        item.SetIcon(objectKey);
        await _repository.UpdateAsync(item, autoSave: true);
        return ToDto(item);
    }

    private ListResultDto<RewardItemDto> List(System.Collections.Generic.IEnumerable<RewardItem> items)
        => new(items.Select(ToDto).ToList());

    private RewardItemDto ToDto(RewardItem item)
    {
        var dto = ObjectMapper.Map<RewardItem, RewardItemDto>(item);
        dto.IconUrl = _urls.ToUrl(item.IconObjectKey);
        return dto;
    }
}
