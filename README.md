# xBim Meets Angular

[Live Demo](https://xbim-web.dangl.me)

This is a demonstration about how to use the [xBim WebUI toolkit](https://github.com/GeorgDangl/XbimWebUI) in combination with TypeScript and Angular.

### Using xBim-WebUI in your project

To include the xBim-WebUI project, you need to **add it as a git-submodule**. There's not yet a npm package available,
so you need to clone it locally and then install via reference, e.g. in `package.json`:
``` JSON
  "scripts": {
    "preinstall": "npm run installXBim",
    "installXBim": "cd .. && cd .. && cd XbimWebUI && powershell ./build.ps1"
  },
  "dependencies": {
    "xbim-viewer": "file:../../XbimWebUI/Xbim.WeXplorer/npm_bundle_output/xbim-viewer",
    "xbim-browser": "file:../../XbimWebUI/Xbim.WeXplorer/npm_bundle_output/xbim-browser"
  }
```

See the `installXBim` script from `package.json` for hints how to locally build the XbimWebUI package.
A npm package release is on it's way, though=)

### Using the xBrowser

The xBrowser is a component that adds some model analytic capabilities. For it to work, it depends on jQuery being available as global variable.
You can see this repositories' `webpack.vendor.config.json` how to provide global variables in webpack builds.

### Continuous Deployment

Here's what I use in Jenkins to build and deploy the app to IIS / Azure.
I'm using the *Credentials Plugin* to inject my WebDeploy credentials and deploy endpoint as environment variables.

1. Git checkout with additional behaviour *Recursively update submodules*
2. Windows Batch command
```
build
```
3. Windows Batch command
```
echo. 2>"%WORKSPACE%\app_offline.htm"
```
The Asp.Net Core module for IIS still (I think?) expects `app_offline.htm` to be all lowercase,
so it's manually generated here instead of using the AppOffline WebDeploy rule.

4. Windows Batch command
```
"C:\Program Files (x86)\IIS\Microsoft Web Deploy V3\msdeploy.exe"
-verb:sync -source:contentPath='"%WORKSPACE%\app_offline.htm"'
-dest:contentPath='xbim-web/app_offline.htm',computerName='%DEPLOY_ENDPOINT%/msdeploy.axd?site=xbim-web',username='%DeployUser%',password='%DeployPassword%',authType='Basic'
```
Copy the `app_offline.htm` to the website

5. Windows Batch command
```
"C:\Program Files (x86)\IIS\Microsoft Web Deploy V3\msdeploy.exe"
-verb:sync -source:IisApp='%WORKSPACE%\src\xBimMeetsAngular\publish'
-dest:iisapp='xbim-web',computerName='%DEPLOY_ENDPOINT%/msdeploy.axd?site=xbim-web',authType='basic',username='%DeployUser%',password='%DeployPassword%'
```
Copy the actual website (this step will also remove the `app_offline.htm` file again)