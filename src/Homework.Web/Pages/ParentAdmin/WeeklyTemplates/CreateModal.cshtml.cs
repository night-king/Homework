using System;
using System.Threading.Tasks;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.WeeklyTemplates;

public class CreateModalModel : HomeworkPageModel
{
    [HiddenInput]
    [BindProperty(SupportsGet = true)]
    public Guid ChildId { get; set; }

    [BindProperty]
    public CreateWeeklyTaskTemplateItemDto Input { get; set; } = new();

    private readonly IWeeklyTaskTemplateAppService _service;
    public CreateModalModel(IWeeklyTaskTemplateAppService service) => _service = service;

    public Task OnGetAsync()
    {
        Input = new CreateWeeklyTaskTemplateItemDto { ChildId = ChildId, Order = 0 };
        return Task.CompletedTask;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        Input.ChildId = ChildId;
        await _service.CreateAsync(Input);
        return NoContent();
    }
}
