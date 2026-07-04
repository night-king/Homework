using System;
using System.Linq;
using System.Threading.Tasks;
using Homework.Permissions;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Authorization;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Domain.Repositories;

namespace Homework.Tasks;

[Authorize(HomeworkPermissions.ParentAdmin)]
public class WeeklyTaskTemplateAppService : HomeworkAppService, IWeeklyTaskTemplateAppService
{
    private readonly IRepository<WeeklyTaskTemplateItem, Guid> _repository;

    public WeeklyTaskTemplateAppService(IRepository<WeeklyTaskTemplateItem, Guid> repository)
        => _repository = repository;

    public async Task<ListResultDto<WeeklyTaskTemplateItemDto>> GetListAsync(GetWeeklyTemplateInput input)
    {
        var childId = input.ChildId;
        var dow = input.DayOfWeek;
        var items = await _repository.GetListAsync(t => t.ChildId == childId && (dow == null || t.DayOfWeek == dow));
        var dtos = items.OrderBy(t => t.DayOfWeek).ThenBy(t => t.Order)
            .Select(t => ObjectMapper.Map<WeeklyTaskTemplateItem, WeeklyTaskTemplateItemDto>(t)).ToList();
        return new ListResultDto<WeeklyTaskTemplateItemDto>(dtos);
    }

    public async Task<WeeklyTaskTemplateItemDto> CreateAsync(CreateWeeklyTaskTemplateItemDto input)
    {
        var item = new WeeklyTaskTemplateItem(GuidGenerator.Create(), input.ChildId, input.DayOfWeek,
            input.Title, input.Subject, input.Order, input.EstimatedMinutes);
        await _repository.InsertAsync(item, autoSave: true);
        return ObjectMapper.Map<WeeklyTaskTemplateItem, WeeklyTaskTemplateItemDto>(item);
    }

    public async Task<WeeklyTaskTemplateItemDto> UpdateAsync(Guid id, UpdateWeeklyTaskTemplateItemDto input)
    {
        var item = await _repository.GetAsync(id);
        item.SetTitle(input.Title);
        item.SetSubject(input.Subject);
        item.SetOrder(input.Order);
        item.SetEstimatedMinutes(input.EstimatedMinutes);
        if (input.IsActive) { item.Activate(); } else { item.Deactivate(); }
        await _repository.UpdateAsync(item, autoSave: true);
        return ObjectMapper.Map<WeeklyTaskTemplateItem, WeeklyTaskTemplateItemDto>(item);
    }

    public Task DeleteAsync(Guid id) => _repository.DeleteAsync(id);
}
