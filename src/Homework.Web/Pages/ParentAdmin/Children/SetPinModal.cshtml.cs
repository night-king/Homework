using System;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.Children;

public class SetPinModalModel : HomeworkPageModel
{
    [HiddenInput]
    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty]
    public SetChildPinDto Input { get; set; } = new();

    private readonly IChildProfileAppService _service;
    public SetPinModalModel(IChildProfileAppService service) => _service = service;

    public Task OnGetAsync()
    {
        Input = new SetChildPinDto();
        return Task.CompletedTask;
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.SetPinAsync(Id, Input);
        return NoContent();
    }
}
