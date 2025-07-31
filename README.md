# Pinpoint Enhancer

## Commands

#### Develop

```shell
npm i
npm run start -- --browser=chrome,firefox
```

#### Packaging

```shell
npm run build -- --browser=chrome,firefox
```

## Structure

```
|-- scripts : scripts for build and start development
|-- src : source code
    |-- background : service worker script
    |-- common : some common deps
        |-- assets
        |-- config
        |-- ...
    |-- content-scripts : scripts and styles for run in context of web pages
        |-- triaging
        |-- ...
    |-- manifest : scripts for generate manifest files
    |-- pages : HTML content, for eg. options or popup window
        |-- options : UI for extension options
        |-- popup : UI for popup window
        |-- ...
    |-- public : other files e.g. icons, this dir will be copied to build without any transformations
```

##

If you have any questions or comments, please create a new issue.
