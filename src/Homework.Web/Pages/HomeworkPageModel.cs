using Homework.Localization;
using Volo.Abp.AspNetCore.Mvc.UI.RazorPages;

namespace Homework.Web.Pages;

/* Inherit your PageModel classes from this class.
 */
public abstract class HomeworkPageModel : AbpPageModel
{
    protected HomeworkPageModel()
    {
        LocalizationResourceType = typeof(HomeworkResource);
    }
}
