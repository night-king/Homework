using System;
using System.Threading.Tasks;
using Homework.Tasks;
using Homework.Tasks.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.DailyTasks;

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

    [BindProperty]
    public UpdateDailyTaskDto Input { get; set; } = new();

    private readonly IDailyTaskAppService _service;
    public EditModalModel(IDailyTaskAppService service) => _service = service;

    public Task OnGetAsync()
    {
        Input = new UpdateDailyTaskDto
        {
            Title = Title,
            Subject = Subject,
            Order = Order
        };
        return Task.CompletedTask;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.UpdateAsync(Id, Input);
        return NoContent();
    }
}
