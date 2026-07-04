using System;
using System.Collections.Generic;
using System.Text;
using Homework.Localization;
using Volo.Abp.Application.Services;

namespace Homework;

/* Inherit your application services from this class.
 */
public abstract class HomeworkAppService : ApplicationService
{
    protected HomeworkAppService()
    {
        LocalizationResource = typeof(HomeworkResource);
    }
}
