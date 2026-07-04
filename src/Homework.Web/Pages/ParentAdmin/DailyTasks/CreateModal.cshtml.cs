using System;
using System.Threading.Tasks;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.DailyTasks;

public class CreateModalModel : HomeworkPageModel
{
    [HiddenInput]
    [BindProperty(SupportsGet = true)]
    public Guid ChildId { get; set; }

    [BindProperty(SupportsGet = true)]
    public DateOnly Date { get; set; }

    [BindProperty]
    public CreateDailyTaskDto Input { get; set; } = new();

    private readonly IDailyTaskAppService _service;
    public CreateModalModel(IDailyTaskAppService service) => _service = service;

    public Task OnGetAsync()
    {
        Input = new CreateDailyTaskDto { ChildId = ChildId, Date = Date, Order = 0 };
        return Task.CompletedTask;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        Input.ChildId = ChildId;
        Input.Date = Date;
        await _service.CreateAsync(Input);
        return NoContent();
    }
}
