using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using Volo.Abp.Account;
using Volo.Abp.Account.Web;
using Volo.Abp.Identity;

namespace Homework.Web.Pages.Account;

/// <summary>
/// Physical-file override of ABP's compiled Register page.
/// Extending the base class gives the physical cshtml its own discoverable
/// PageModel while keeping all ABP registration logic intact.
/// Server-side consent enforcement is a hardening item for go-live;
/// client-side gate is applied in Register.cshtml.
/// </summary>
public class RegisterModel : Volo.Abp.Account.Web.Pages.Account.RegisterModel
{
    public RegisterModel(
        IAccountAppService accountAppService,
        IAuthenticationSchemeProvider authenticationSchemeProvider,
        IOptions<AbpAccountOptions> abpAccountOptions,
        IdentityDynamicClaimsPrincipalContributorCache identityDynamicClaimsPrincipalContributorCache)
        : base(accountAppService, authenticationSchemeProvider, abpAccountOptions, identityDynamicClaimsPrincipalContributorCache)
    {
    }
}
