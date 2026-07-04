using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Children.Dtos;
using Homework.Permissions;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Children;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class ChildProfileAppService : HomeworkAppService, IChildProfileAppService
{
    private readonly IRepository<ChildProfile, Guid> _repository;

    public ChildProfileAppService(IRepository<ChildProfile, Guid> repository)
        => _repository = repository;

    public async Task<ListResultDto<ChildProfileDto>> GetListAsync()
    {
        var children = await _repository.GetListAsync();
        var dtos = children.OrderBy(c => c.Grade).Select(ToDto).ToList();
        return new ListResultDto<ChildProfileDto>(dtos);
    }

    public async Task<ChildProfileDto> GetAsync(Guid id)
        => ToDto(await _repository.GetAsync(id));

    public async Task<ChildProfileDto> UpdateAsync(Guid id, UpdateChildProfileDto input)
    {
        var child = await _repository.GetAsync(id);
        child.SetDisplayName(input.DisplayName);
        child.SetGrade(input.Grade);
        child.SetAvatar(input.AvatarKey);
        await _repository.UpdateAsync(child);
        return ToDto(child);
    }

    public async Task SetPinAsync(Guid id, SetChildPinDto input)
    {
        var child = await _repository.GetAsync(id);
        child.SetPin(string.IsNullOrEmpty(input.Pin) ? null : input.Pin);
        await _repository.UpdateAsync(child);
    }

    private ChildProfileDto ToDto(ChildProfile child)
    {
        var dto = ObjectMapper.Map<ChildProfile, ChildProfileDto>(child);
        dto.HasPin = !string.IsNullOrEmpty(child.Pin);
        return dto;
    }
}
