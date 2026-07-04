using System;
using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.Children;

public class EditModalModel : HomeworkPageModel
{
    [HiddenInput]
    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty]
    public UpdateChildProfileDto Input { get; set; } = new();

    private readonly IChildProfileAppService _service;
    public EditModalModel(IChildProfileAppService service) => _service = service;

    public async Task OnGetAsync()
    {
        var dto = await _service.GetAsync(Id);
        Input = new UpdateChildProfileDto { DisplayName = dto.DisplayName, Grade = dto.Grade, AvatarKey = dto.AvatarKey };
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.UpdateAsync(Id, Input);
        return NoContent();
    }
}
