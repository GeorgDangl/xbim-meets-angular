using Nuke.Common;
using Nuke.Common.Execution;
using Nuke.Common.IO;
using Nuke.Common.ProjectModel;
using Nuke.Common.Tools.AzureKeyVault.Attributes;
using Nuke.Common.Tools.DotCover;
using Nuke.Common.Tools.DotNet;
using Nuke.Common.Tools.GitVersion;
using Nuke.Common.Tools.NSwag;
using Nuke.Common.Tools.Teams;
using Nuke.Common.Tools.WebConfigTransformRunner;
using Nuke.Common.Utilities;
using Nuke.Common.Utilities.Collections;
using System;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Text;
using static Nuke.Common.IO.FileSystemTasks;
using static Nuke.Common.IO.PathConstruction;
using static Nuke.Common.IO.TextTasks;
using static Nuke.Common.Tools.DotNet.DotNetTasks;
using static Nuke.Common.Tools.WebConfigTransformRunner.WebConfigTransformRunnerTasks;

[CheckBuildProjectConfigurations(TimeoutInMilliseconds = 1_000)]
class Build : NukeBuild
{
    public static int Main() => Execute<Build>(x => x.Publish);

    [KeyVaultSettings(
        BaseUrlParameterName = nameof(KeyVaultBaseUrl),
        ClientIdParameterName = nameof(KeyVaultClientId),
        ClientSecretParameterName = nameof(KeyVaultClientSecret))]
    readonly KeyVaultSettings KeyVaultSettings;

    [Parameter] string KeyVaultBaseUrl;
    [Parameter] string KeyVaultClientId;
    [Parameter] string KeyVaultClientSecret;

    [Parameter("Configuration to build - Default is 'Debug' (local) or 'Release' (server)")]
    readonly Configuration Configuration = IsLocalBuild ? Configuration.Debug : Configuration.Release;

    [Parameter] readonly string PublishEnvironmentName;

    [Solution] readonly Solution Solution;

    AbsolutePath SolutionDirectory => Solution.Directory;
    AbsolutePath SourceDirectory => SolutionDirectory / "src";
    AbsolutePath OutputDirectory => SolutionDirectory / "output";
    AbsolutePath PublishDirectory => OutputDirectory / "publish";

    [KeyVaultSecret("XbimMeetsAngular-DeployUsername")] readonly string DeployUsername;
    [KeyVaultSecret("XbimMeetsAngulaer-DeployPassword")] readonly string DeployPassword;
    [KeyVaultSecret] string DanglCiCdTeamsWebhookUrl;
    [Parameter] string AppServiceName = "xbim-meets-angular";

    protected override void OnTargetFailed(string target)
    {
        if (IsServerBuild)
        {
            SendTeamsMessage("Build Failed", $"Target {target} failed for xBimMeetsAngular", true);
        }
    }

    private void SendTeamsMessage(string title, string message, bool isError)
    {
        if (!string.IsNullOrWhiteSpace(DanglCiCdTeamsWebhookUrl))
        {
            var themeColor = isError ? "f44336" : "00acc1";
            TeamsTasks
                .SendTeamsMessage(m => m
                    .SetTitle(title)
                    .SetText(message)
                    .SetThemeColor(themeColor),
                    DanglCiCdTeamsWebhookUrl);
        }
    }

    Target Clean => _ => _
        .Executes(() =>
        {
            GlobDirectories(SourceDirectory / "xBimMeetsAngular", "**/bin", "**/obj", "**/wwwroot/dist").ForEach(DeleteDirectory);
            EnsureCleanDirectory(SourceDirectory / "xBimMeetsAngular" / "node_modules");
            EnsureCleanDirectory(OutputDirectory);
        });

    Target Restore => _ => _
        .DependsOn(Clean)
        .Executes(() =>
        {
            DotNetRestore();
        });

    Target Publish => _ => _
        .Requires(() => PublishEnvironmentName)
        .DependsOn(Restore)
        .Requires(() => Configuration == Configuration.Release)
        .Executes(() =>
        {
            DotNetPublish(s => s.SetProject(SourceDirectory / "xBimMeetsAngular")
                .SetRuntime("win-x64")
                .SetOutput(PublishDirectory)
                .SetConfiguration(Configuration));

            WebConfigTransformRunner(p => p.SetWebConfigFilename(PublishDirectory / "web.config")
                .SetTransformFilename(PublishDirectory / $"web.{PublishEnvironmentName}.config")
                .SetOutputFilename(PublishDirectory / "web.config"));

            foreach (var configFileToDelete in GlobFiles(PublishDirectory, "web.*.config"))
            {
                File.Delete(configFileToDelete);
            }

            foreach (var configFileToDelete in GlobFiles(PublishDirectory, "appsettings.*.json"))
            {
                if (!configFileToDelete.EndsWithOrdinalIgnoreCase($"{PublishEnvironmentName}.json"))
                {
                    File.Delete(configFileToDelete);
                }
            }
        });

    Target Deploy => _ => _
        .DependsOn(Publish)
        .Requires(() => DeployUsername)
        .Requires(() => DeployPassword)
        .Requires(() => AppServiceName)
        .Executes(async () =>
        {
            var base64Auth = Convert.ToBase64String(Encoding.Default.GetBytes($"{DeployUsername}:{DeployPassword}"));
            ZipFile.CreateFromDirectory(PublishDirectory, OutputDirectory / "deployment.zip");
            using (var memStream = new MemoryStream(ReadAllBytes(OutputDirectory / "deployment.zip")))
            {
                memStream.Position = 0;
                var content = new StreamContent(memStream);
                var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", base64Auth);
                var requestUrl = $"https://{AppServiceName}.scm.azurewebsites.net/api/zipdeploy";
                var response = await httpClient.PostAsync(requestUrl, content);
                var responseString = await response.Content.ReadAsStringAsync();
                Logger.Normal(responseString);
                Logger.Normal("Deployment finished");
                if (!response.IsSuccessStatusCode)
                {
                    SendTeamsMessage("Deployment failed", "Deployment for xBimMeetsAngular failed", true);
                    ControlFlow.Fail("Deployment returned status code: " + response.StatusCode);
                }
                else
                {
                    SendTeamsMessage("Deployment finished", "Deployment for xBimMeetsAngular finished", false);
                }
            }
        })
        .Executes(Clean);
}
