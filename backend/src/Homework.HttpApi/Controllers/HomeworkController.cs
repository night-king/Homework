using Homework.Localization;
using Volo.Abp.AspNetCore.Mvc;

namespace Homework.Controllers;

/* Inherit your controllers from this class.
 */
public abstract class HomeworkController : AbpControllerBase
{
    protected HomeworkController()
    {
        LocalizationResource = typeof(HomeworkResource);
    }
}
