const { Octokit } = require("@octokit/core");
const readline = require("readline");
const fs = require("fs");

async function main() {
    if (process.env.PAT === undefined) {
        console.error("Please set environment variable $PAT to a personal access token.")
        return
    }
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    function q(theQuestion) {
        return new Promise(resolve => rl.question(theQuestion, ans => resolve(ans)))
    }

    const org = await q("Enter the name of the org: ")
    const repo = await q("Enter the name of the repo: ")
    const branchName = await q("Enter the new branch name: ")
    const base = await q("Enter the base branch name: ")
    rl.close()

    const filename = `log-${Math.round(new Date().getTime()/1000)}.txt`
    fs.appendFileSync(filename, `Creating branch '${branchName}' in '${org}/${repo}' from '${base}'\n\n`)

    const octokit = new Octokit({auth: process.env.LOCAL_GITHUB_ACCESS_TOKEN});

    let response = await octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
        owner: org,
        repo: repo,
        content: "Hello blob!",
        encoding: "utf-8"
    });

    fs.appendFileSync(filename, JSON.stringify(response, null, 2) + "\n\n")

    if (response.status !== 201) {
        return console.error("Failed to create blob")
    }
    const blob = response.data

    response = await octokit.request("GET /repos/{owner}/{repo}/branches/main", {
        owner: org,
        repo: repo
    });

    fs.appendFileSync(filename, JSON.stringify(response, null, 2) + "\n\n")

    if (response.status !== 200) {
        return console.error("Failed to get branch")
    }
    const branch = response.data

    response = await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
        owner: org,
        repo: repo,
        tree: [
            {
                path: "test.txt",
                mode: "100644",
                type: "blob",
                sha: blob.sha
            },
            {
                path: "test2.txt",
                mode: "100644",
                type: "blob",
                content: "Hello content!"
            }
        ],
        base_tree: branch.commit.sha
    });

    fs.appendFileSync(filename, JSON.stringify(response, null, 2) + "\n\n")

    if (response.status !== 201) {
        return console.error("Failed to create tree")
    }
    const tree = response.data

    response = await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
        owner: org,
        repo: repo,
        message: "test commit",
        tree: tree.sha,
        parents: [branch.commit.sha]
    });

    fs.appendFileSync(filename, JSON.stringify(response, null, 2) + "\n\n")

    if (response.status !== 201) {
        return console.error("Failed to create commit")
    }
    const commit = response.data

    response = await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
        owner: org,
        repo: repo,
        ref: "refs/heads/"+branchName,
        sha: commit.sha
    });

    fs.appendFileSync(filename, JSON.stringify(response, null, 2) + "\n\n")

    if (response.status !== 201) {
        return console.error("Failed to create branch")
    }

    response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
        owner: org,
        repo: repo,
        title: "test PR",
        head: branchName,
        base: base
    });

    fs.appendFileSync(filename, JSON.stringify(response, null, 2) + "\n\n")

    if (response.status !== 201) {
        return console.error("Failed to create pull request")
    }

    console.log("PR created: "+response.data.html_url)
}

main().catch(console.error);

