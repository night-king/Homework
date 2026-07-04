using System;
using System.Threading.Tasks;
using Homework.Scoring;
using Homework.Scoring.Dtos;
using Microsoft.AspNetCore.Mvc;
using Homework.Web.Pages;

namespace Homework.Web.Pages.ParentAdmin.FamilyGoals;

public class EditModalModel : HomeworkPageModel
{
    [HiddenInput]
    [BindProperty(SupportsGet = true)]
    public Guid Id { get; set; }

    [BindProperty]
    public CreateUpdateFamilyGoalDto Input { get; set; } = new();

    private readonly IFamilyGoalAppService _service;
    public EditModalModel(IFamilyGoalAppService service) => _service = service;

    public async Task OnGetAsync()
    {
        var d = await _service.GetAsync(Id);
        Input = new CreateUpdateFamilyGoalDto
        {
            Title = d.Title,
            TargetStars = d.TargetStars,
            RewardText = d.RewardText,
            StartDate = d.StartDate,
            EndDate = d.EndDate
        };
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await _service.UpdateAsync(Id, Input);
        return NoContent();
    }
}
