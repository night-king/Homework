using Microsoft.Extensions.Localization;
using Homework.Localization;
using Volo.Abp.Ui.Branding;
using Volo.Abp.DependencyInjection;

namespace Homework.Web;

[Dependency(ReplaceServices = true)]
public class HomeworkBrandingProvider : DefaultBrandingProvider
{
    private IStringLocalizer<HomeworkResource> _localizer;

    public HomeworkBrandingProvider(IStringLocalizer<HomeworkResource> localizer)
    {
        _localizer = localizer;
    }

    public override string AppName => _localizer["AppName"];
}
