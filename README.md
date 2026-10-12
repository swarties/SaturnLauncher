# Saturn Launcher

Our take on a lightweight, ad-free, minimalistic, and blazingly fast open-source Minecraft launcher!

## System Requirements:
- OS: Windows 10/11 (Requires WebView2; Comes with a regular Windows 11 install)
- CPU: 2+ cores
- RAM: 1GB of free RAM
- Storage: 50 MB of free storage
- Network: Required for login and installing the game and mods from modrinth

## Install Steps

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
React front-end with Vite
  - TanStack Router
  - shadcn
  - TailwindCSS v4
  - DaisyUI v5
  - Motion-Primitives
Using wailsIo V2.15.0


## Project State
- Microsoft and Minecraft authentication finished in both backend and frontend
- Launching the app keeps the refresh key and user hash always up to date
- Initializing the necessary folders to always exist on launch
- Can install game assets, game libraries, extract natives, and find the right java version for the selected game version
- Added an id based instance manager
- Instance Page 
- Per Instance Page 
- Profile Page 
- Settings Page 
- Onboarding 
- Added Support for linux java
- Can Launch the game from any version starting 1.14
- Can Select ram allocation for instances
- Added Multi Account Support
- Added Light And Dark Mode
- Turned Instances to be UUID based
- Linked logout
- Login Page Redesign
- Instance selector in home page
- Alt + num navigation
- Various FrontEnd Bug Fixes
- Finished fabric installation
- Added Icon and Description
- Added Game Logs
- Added Installing/Deleting and fetching Content ( mods, resource packs and shaders ) not connected to the frontend
- Added Modrinth Discovery Page, Project Page, Version Page and a recursive Install Project function that gets the dependencies for a mod and the dependencies that dependency might have ( Not Connected to frontend )
- Added Icons for vanilla and fabric
- Default an instance's icon to its loader's icon


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

| <img width="1262" height="721" alt="image" src="https://github.com/user-attachments/assets/6d7c2b2d-08b7-459a-a898-932010f5638f" /> | <img width="443" height="415" alt="image" src="https://github.com/user-attachments/assets/42e4ed13-67b5-4107-b366-2ad473b1c510" /> |
| :---: | :---: |
| <img width="1258" height="722" alt="image" src="https://github.com/user-attachments/assets/97e5baa3-9980-4215-89c4-f33ef1bdeed9" /> | <img width="1258" height="725" alt="image" src="https://github.com/user-attachments/assets/5dbfcc37-493d-48d6-b262-d23eee3c4f50" /> |
| <img width="443" height="497" alt="image" src="https://github.com/user-attachments/assets/1eebe8c1-e8db-4ab9-afe1-d30e7f472844" /> | <img width="1260" height="725" alt="image" src="https://github.com/user-attachments/assets/01846675-0f87-422c-ae34-451f87cd791a" />
 |




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











