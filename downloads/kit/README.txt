These three files are the source of ../bloom-rewards-page.zip.
To rebuild the kit: copy the rewards-page files into a files/ folder here,
then zip this whole directory. See the branch diff against main for the
exact file list (55 files).

---

BLOOM — REWARDS PAGE
====================

The rewards page, rebuilt as a personal journey: goals, points, milestones,
ranks, achievements. This zip contains only that — no other part of the app.


HOW TO USE IT
-------------

1. Extract this folder anywhere.

2. Open it in VS Code:  File → Open Folder → bloom-rewards

3. In the VS Code terminal (Terminal → New Terminal), run:

       bash apply.sh

   On Windows PowerShell, instead run:

       powershell -ExecutionPolicy Bypass -File apply.ps1

That is the whole thing. It will:
  · find your bloom-app project automatically
  · copy the Rewards page files in
  · back up every file it replaces (into backup-<date>/ right here)
  · install dependencies if needed
  · check the code compiles
  · ask whether to start the app

Then open /rewards — that is the new page.


IF YOU DO NOT HAVE BLOOM YET
----------------------------

Just run the same command. When it cannot find a project it offers to clone
one for you and sets it up, also into this folder.

Or, if you would rather do it by hand, in the folder where you keep projects:

    git clone --branch arena/01a087e8-bloom-app https://github.com/Maelix-glitch/bloom-app.git
    cd bloom-app
    npm install
    npm run dev


WHAT IS IN HERE
---------------

files/      the Rewards page itself — components, logic, styles, routes,
            the atelier artwork, and the SQL migration
apply.sh  the installer (macOS, Linux, Git Bash on Windows)
apply.ps1 the installer (Windows PowerShell)
remove.txt  the two old shop files that the new page replaces

Nothing outside the Rewards feature is touched: your moods, cycle, habits,
trackers, coach and profile work exactly as they did.


ABOUT THE DATABASE
------------------

The page works without a database (it reads your device records). When you are
signed in, points are verified and awarded server-side. To switch that on, run
this once in the Supabase SQL editor:

    files/supabase/migrations/20260910_progression.sql

It is additive and safe to run twice. It does not change anything already
earned, and the existing reward tables stay exactly as they are.

Until you run it, awards fall back to the device and the page still works.


TWO HONEST NOTES
----------------

· The old shop page (RewardsPage + PointsStrip) is deleted by the installer,
  because the new journey page replaces it.
· Customisation now lives behind the journey, at /rewards/atelier. It is
  opened by ranks, achievements and milestones rather than being the point of
  the page.
