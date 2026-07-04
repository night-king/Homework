using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Users;

namespace Homework.Children;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class ChildProfileAppService : HomeworkAppService, IChildProfileAppService
{
    private readonly IRepository<ChildProfile, Guid> _repository;
    private readonly ChildProfileManager _manager;

    public ChildProfileAppService(IRepository<ChildProfile, Guid> repository, ChildProfileManager manager)
    {
        _repository = repository;
        _manager = manager;
    }

    public async Task<ListResultDto<ChildProfileDto>> GetListAsync()
    {
        var parentId = CurrentUser.GetId();
        var children = await _repository.GetListAsync(c => c.ParentId == parentId);
        var dtos = children.OrderBy(c => c.Grade).Select(ToDto).ToList();
        return new ListResultDto<ChildProfileDto>(dtos);
    }

    public async Task<ChildProfileDto> GetAsync(Guid id) => ToDto(await _manager.GetOwnedAsync(id));

    public async Task<ChildProfileDto> CreateAsync(CreateChildDto input)
    {
        var child = new ChildProfile(GuidGenerator.Create(), CurrentUser.GetId(), input.DisplayName, input.Grade);
        child.SetAvatar(input.AvatarKey);
        await _repository.InsertAsync(child, autoSave: true);
        return ToDto(child);
    }

    public async Task<ChildProfileDto> UpdateAsync(Guid id, UpdateChildProfileDto input)
    {
        var child = await _manager.GetOwnedAsync(id);
        child.SetDisplayName(input.DisplayName);
        child.SetGrade(input.Grade);
        child.SetAvatar(input.AvatarKey);
        await _repository.UpdateAsync(child);
        return ToDto(child);
    }

    public async Task SetPinAsync(Guid id, SetChildPinDto input)
    {
        var child = await _manager.GetOwnedAsync(id);
        child.SetPin(string.IsNullOrEmpty(input.Pin) ? null : input.Pin);
        await _repository.UpdateAsync(child);
    }

    public async Task DeleteAsync(Guid id)
    {
        var child = await _manager.GetOwnedAsync(id);
        await _repository.DeleteAsync(child);
    }

    private ChildProfileDto ToDto(ChildProfile child)
    {
        var dto = ObjectMapper.Map<ChildProfile, ChildProfileDto>(child);
        dto.HasPin = !string.IsNullOrEmpty(child.Pin);
        return dto;
    }
}
