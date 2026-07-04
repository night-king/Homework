using Volo.Abp.Settings;

namespace Homework.Settings;

public class HomeworkSettingDefinitionProvider : SettingDefinitionProvider
{
    public override void Define(ISettingDefinitionContext context)
    {
        //Define your own settings here. Example:
        //context.Add(new SettingDefinition(HomeworkSettings.MySetting1));
    }
}
