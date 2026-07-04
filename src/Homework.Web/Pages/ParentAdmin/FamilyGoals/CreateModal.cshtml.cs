using System.Threading.Tasks;
using Homework.Scoring;
using Homework.Scoring.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.FamilyGoals;

public class CreateModalModel : HomeworkPageModel
{
    [BindProperty]
    public CreateUpdateFamilyGoalDto Input { get; set; } = new();

    private readonly IFamilyGoalAppService _service;
    public CreateModalModel(IFamilyGoalAppService service) => _service = service;

    public void OnGet()
    {
        Input = new CreateUpdateFamilyGoalDto();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.CreateAsync(Input);
        return NoContent();
    }
}
