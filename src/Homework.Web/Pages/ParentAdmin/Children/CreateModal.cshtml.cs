using System.Threading.Tasks;
using Homework.Children;
using Homework.Children.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.Children;

public class CreateModalModel : HomeworkPageModel
{
    [BindProperty]
    public CreateChildDto Input { get; set; } = new();

    private readonly IChildProfileAppService _service;
    public CreateModalModel(IChildProfileAppService service) => _service = service;

    public void OnGet()
    {
        Input = new CreateChildDto();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.CreateAsync(Input);
        return NoContent();
    }
}
