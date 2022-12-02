const { Octokit } = require("@octokit/core");
const readline = require("readline");

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

    const octokit = new Octokit({auth: process.env.LOCAL_GITHUB_ACCESS_TOKEN});

    const { data: blob } = await octokit.request("POST /repos/{owner}/{repo}/git/blobs", {
        owner: org,
        repo: repo,
        content: "Hello world!",
        encoding: "utf-8"
    });

    console.log(blob);

    const { data: branch } = await octokit.request("GET /repos/{owner}/{repo}/branches/main", {
        owner: org,
        repo: repo
    });

    console.log(branch);

    const { data: tree } = await octokit.request("POST /repos/{owner}/{repo}/git/trees", {
        owner: org,
        repo: repo,
        tree: [
            {
                path: "test.txt",
                mode: "100644",
                type: "blob",
                sha: blob.sha
            }
        ],
        base_tree: branch.commit.sha
    });

    console.log(tree);

    const { data: commit } = await octokit.request("POST /repos/{owner}/{repo}/git/commits", {
        owner: org,
        repo: repo,
        message: "test commit",
        tree: tree.sha,
        parents: [branch.commit.sha]
    });

    console.log(commit);

    const { data: newBranch } = await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
        owner: org,
        repo: repo,
        ref: "refs/heads/"+branchName,
        sha: commit.sha
    });

    console.log(newBranch);

    const { data: pullRequest } = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
        owner: org,
        repo: repo,
        title: "test PR",
        head: branchName,
        base: base
    });

    console.log(pullRequest);
}

main().catch(console.error);

