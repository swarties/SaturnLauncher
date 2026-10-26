# Saturn Launcher

Our take on a lightweight, ad-free, minimalistic, and blazingly fast open-source Minecraft launcher!
This project was made for the ThirdSpace YSWS.

## Main Contributors

- [@swarties](https://github.com/swarties) for all the front-end work
- [@SlowOnARocketTM](https://github.com/SlowOnARocketTM) for all the back-end work

## System Requirements:
- OS: Windows 10/11 (Requires WebView2; Comes with a regular Windows 11 install) or Linux
- CPU: 2+ cores
- RAM: 1GB of free RAM ( 4+ gb to run minecraft )
- Storage: 50 MB of free storage ( additional 1.5GB for java + minecraft files )
- Network: Required for login and installing the game and mods from modrinth
- Java: No Installation Required 

## Install Steps

#### **[Download The Latest Version Of Saturn Launcher](https://github.com/swarties/SaturnLauncher/releases/latest)**

> [!WARNING]
>  Windows Smartscreen warning
>
>  Because the launcher is currently unsigned, windows displays a "Windows protected your pc alert"
>
>  How To Install:
>
>  1. Click the small 'more info' button
>
>  2. Click 'Run anyways'
>     

## Tech Stack

Golang V1.27.1 for back-end 
  - Grab Library
  - Google/UUID
  - GopsUtil

React front-end with Vite
  - TanStack Router
  - shadcn
  - TailwindCSS v4
  - DaisyUI v5
  - Motion-Primitives
Using wailsIo V2.15.0


## Features

#### Authentication + MultiAccount support

- Full Microsoft login flow using OAuth code
- Automatic token refresh on launch
- Multi Account Support ( 1 JSON file per account + an active.json file to determine which account is active)


#### Game Launch

- Install client jar + JSON using grab downloader
- Install libraries using grab per version
- Extract natives
- Assets Install ( Grab Batch Downloader (6 workers at once ))
- Game Lifecycle to prevent launching the same instance twice
- Self-healing game files on launch
- Live Java + Game logs to be able to see java errors
- World Listing ( preparing for quickplay )

#### Java

- Added a java silent installer + extraction support for linux and windows
- Added java overrides ( select your own java )

#### Instance Manager

- UUID based instance system 
- Self Healing folders
- Easy to read instance.json file containing java args ,memory ,name ,fabric , game version, description etc...
- Ability to select the custom java args ram icon etc for each instance

#### Content Manager

- Install mods, resource packs and shaders using local files
- Fully Install modrinth modpacks and their overrides ( not implement in frontend )
- List Mods ,Resource Packs ,and ShaderPacks ( Rich Metadata available for mods and resource packs )
- Enable Disable Mods ,Resource Packs ,and ShaderPacks ( add .disabled to the end of the file name )

#### Fabric Loader Support

- Install Fabric Loader when creating an instance ( uses fabric api + libs injection instead of using the limited installer.jar fabric provides )

#### Modrinth Support

- Discovery Page
- Ability to look up mods, shaders and resource packs ( installing modpacks from modrinth support is a planned feature )
- Individual Project Page
- Version Page for each project
- Recursive mod + deps installation ( Installs mods and their deps (and the deps of deps ))
- Modrinth Manifest
- Modrinth Update system ( backend )
- Installed checkmarks thanks to manifest

#### Various 

- Check file authenticity using size ( wayy faster than checking their SHA1 every time( it is checked after install ))
- Light and Dark Mode
- Alt + Num Navigation
- Clean GUI
- Bloat free
- No ads
- Auto-update from github on launch ( supports nsis, portable version and linux )
- Skin lookup and select + upload to minecraft servers ( backend )
- Screenshot manager
- Discord Rich Presence

#### Migration

- Migrate from prism ( backend only )

## Planned Features

- Add Forge and NeoForge
- Friends List with built-in dms ( maybe )
- Modrinth Updater ( backend done )
- Skin Changer (lookup skin and use them or drag n drop your own skins)
- Modpack Export
- Check for mod conflicts pre-launch
- Allow Instance Duplication
- Token Encryption ( lots of launchers don't do it, but it's important )
- World backups

## Motivation
Most launchers today are aesthetically unpleasing, are filled with ads, and are too bloated. That's why we're working on a great alternative to those options.

## Gallery

### Login

| <img width="1262" height="723" alt="image" src="https://github.com/user-attachments/assets/262f6783-296b-445a-aded-89880316b00f" /> | <img width="1258" height="727" alt="image" src="https://github.com/user-attachments/assets/e3e0bd63-4d54-480b-8fcd-dee646125194" /> |
| :---: | :---: |


### Onboarding

| <img width="1259" height="755" alt="image" src="https://github.com/user-attachments/assets/be79fbfe-587a-48fc-b177-c3a07b66c769" /> | <img width="1264" height="756" alt="image" src="https://github.com/user-attachments/assets/ed26aabb-ce36-441f-8e25-e5875f8af1a7" /> |
| :---: | :---: |


### Settings:

| <img width="1263" height="727" alt="image" src="https://github.com/user-attachments/assets/2fe57ffc-6ccd-490b-ac91-77370950dfc8" /> | <img width="1257" height="726" alt="image" src="https://github.com/user-attachments/assets/a8e0bff8-e3eb-4d94-b927-a71f3a2b3a62" /> |
| :---: | :---: |

### Instances

| <img width="1262" height="721" alt="image" src="https://github.com/user-attachments/assets/6d7c2b2d-08b7-459a-a898-932010f5638f" /> | <img width="878" height="414" alt="image" src="https://github.com/user-attachments/assets/4bd95926-3ec6-4dd9-8b04-2d8b2327e4ab" /> |
| :---: | :---: |
| <img width="1258" height="722" alt="image" src="https://github.com/user-attachments/assets/97e5baa3-9980-4215-89c4-f33ef1bdeed9" /> | <img width="926" height="652" alt="image" src="https://github.com/user-attachments/assets/8156e5cf-68ec-4c37-99ec-6d16315c52c3" />|
| <img width="443" height="497" alt="image" src="https://github.com/user-attachments/assets/1eebe8c1-e8db-4ab9-afe1-d30e7f472844" /> | <img width="1260" height="725" alt="image" src="https://github.com/user-attachments/assets/01846675-0f87-422c-ae34-451f87cd791a" />


### Modrinth

| <img width="937" height="660" alt="image" src="https://github.com/user-attachments/assets/a8eb8792-3881-4e42-b67a-91ab2edc1205" /> | <img width="1262" height="722" alt="image" src="https://github.com/user-attachments/assets/6c14b10a-6d17-4c38-9bf3-0aab5ac42c12" /> |
| :---: | :---: |

### Screenshot manager

| <img width="1249" height="712" alt="image" src="https://github.com/user-attachments/assets/86a51a32-343e-415e-904b-904ddd8508a7" /> | <img width="1054" height="604" alt="image" src="https://github.com/user-attachments/assets/5b9a7288-2cfd-45a0-91d5-a66f233bffdb" /> |
| :---: | :---: |



### Multi Account :

<table>
  <tr>
    <td align="center">
      <img height="450" alt="Screenshot 1" src="https://github.com/user-attachments/assets/0e8ae045-b2f3-4bee-ada7-705f4fcf5998" />
    </td>
    <td align="center">
      <img height="450" alt="Screenshot 2" src="https://github.com/user-attachments/assets/08b84c60-cee3-4519-afd9-d2be24e1a1f6" />
    </td>
    <td align="center">
      <img height="450" alt="Screenshot 3" src="https://github.com/user-attachments/assets/68308f20-47c9-427d-8aad-9bc02be26f1d" />
    </td>
  </tr>
</table>










