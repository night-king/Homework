using System;
using System.Threading.Tasks;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.WeeklyTemplates;

public class EditModalModel : HomeworkPageModel
{
    [HiddenInput]
    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty(SupportsGet = true)]
    public string Title { get; set; } = string.Empty;

    [BindProperty(SupportsGet = true)]
    public string? Subject { get; set; }

    [BindProperty(SupportsGet = true)]
    public int Order { get; set; }

    [BindProperty(SupportsGet = true)]
    public int? EstimatedMinutes { get; set; }

    [BindProperty(SupportsGet = true)]
    public bool IsActive { get; set; }

    [BindProperty]
    public UpdateWeeklyTaskTemplateItemDto Input { get; set; } = new();

    private readonly IWeeklyTaskTemplateAppService _service;
    public EditModalModel(IWeeklyTaskTemplateAppService service) => _service = service;

    public Task OnGetAsync()
    {
        Input = new UpdateWeeklyTaskTemplateItemDto
        {
            Title = Title,
            Subject = Subject,
            Order = Order,
            EstimatedMinutes = EstimatedMinutes,
            IsActive = IsActive
        };
        return Task.CompletedTask;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.UpdateAsync(Id, Input);
        return NoContent();
    }
}
