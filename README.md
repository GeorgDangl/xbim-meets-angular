# xBim Meets Angular

[Live Demo](https://xbim-web.dangl.me)

This is a demonstration about how to use the [xBim WebUI toolkit](https://github.com/GeorgDangl/XbimWebUI) in combination with TypeScript and Angular.

### Using xBim-WebUI in your project

To include the xBim-WebUI project, you need to **add it as a git-submodule**. There's not yet a npm package available,
so you need to clone it locally and then install via reference, e.g. in `package.json`:
``` JSON
  "dependencies": {
    "xbim-webui": "file:../../XbimWebUI/Xbim.WeXplorer"
  }
```

### Using the xBrowser

The xBrowser is a component that adds some model analytic capabilities. For it to work, it depends on jQuery being available as global variable.
You can see this repositories' `webpack.vendor.config.json` how to provide global variables in webpack builds.