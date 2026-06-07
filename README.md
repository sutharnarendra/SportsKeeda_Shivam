![Shell Script](https://img.shields.io/badge/Shell-Bash%205.x-4EAA25?logo=gnu-bash&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Oracle%20Cloud-F80000?logo=oracle&logoColor=white)
![Region](https://img.shields.io/badge/Region-ap--mumbai--1-orange)

# YatraX Ampere Auto-Provisioner

**Relentlessly retries OCI Ampere A1.Flex instance creation until capacity opens up — so you don't have to.**

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation \& Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Sample Output](#sample-output)
- [Increasing Success Probability](#increasing-success-probability)
- [Caveats \& Limitations](#caveats--limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Oracle Cloud's Always Free Tier includes up to 4 OCPUs and 24 GB RAM of Ampere A1.Flex compute — genuinely powerful ARM instances at zero cost. The catch? Everyone wants them.

Attempting to launch an A1.Flex instance in high-demand regions like Mumbai (`ap-mumbai-1`) almost always returns:

```text
ServiceError: Out of host capacity
```

Oracle doesn't queue your request. It simply rejects it. The only strategy is to keep trying until a slot opens — which could be minutes, hours, or days.

**YatraX Ampere Auto-Provisioner** automates this retry loop. It repeatedly calls the OCI CLI to launch instances with exponential backoff, jitter, and lifecycle polling. When an instance comes online, it prints the SSH command and moves on to the next one — stopping automatically after your desired count is reached.

---

## How It Works

```text
┌─────────────────────────────────────┐
│       Read config from .env         │
│   (/etc/yatrax/.env)                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   instances_created < MAX_INSTANCES?│
│                                     │
│     NO ──────► EXIT (success)       │
└──────────────┬──────────────────────┘
               │ YES
               ▼
┌─────────────────────────────────────┐
│  oci compute instance launch        │
│  --shape VM.Standard.A1.Flex        │
│  --shape-config 2 OCPU / 12 GB     │
│  --availability-domain (single AD)  │
└──────────────┬──────────────────────┘
               │
          ┌────┴─────┐
          │          │
       SUCCESS    FAILURE
          │     (Out of host capacity)
          │          │
          ▼          ▼
┌──────────────┐  ┌────────────────────────┐
│ Poll instance│  │ Exponential backoff    │
│ state every  │  │ delay += 30s           │
│ 30s for up   │  │ (max 300s) + jitter    │
│ to 10 mins   │  │ (0–30s random)         │
│              │  └───────────┬────────────┘
└──────┬───────┘              │
       │                      │
       ▼                      ▼
┌──────────────┐     ┌────────────────┐
│  RUNNING?    │     │  RETRY LAUNCH  │──► (loop back)
│  Print SSH   │     └────────────────┘
│  command     │
│  instances++ │
└──────┬───────┘
       │
       ▼
  (loop back to instance count check)
```

**Step-by-step:**

1. **Load configuration** — Reads `COMPARTMENT_ID`, `SUBNET_OCID`, `IMAGE_OCID`, and `SSH_PUBLIC_KEY_PATH` from `/etc/yatrax/.env`.
2. **Check instance count** — If the number of successfully created instances equals `MAX_INSTANCES`, exit gracefully.
3. **Attempt launch** — Calls `oci compute instance launch` with the A1.Flex shape, 2 OCPUs, 12 GB RAM, and the configured subnet/image.
4. **Handle failure** — On "Out of host capacity" or any API error, calculate the next retry delay using exponential backoff (starting at 60s, incrementing by 30s per attempt, capped at 300s) plus random jitter (0–30s) to avoid thundering herd effects.
5. **Handle success** — Extract the instance OCID from the launch response and begin polling the lifecycle state every 30 seconds.
6. **Poll lifecycle** — Wait up to 10 minutes for the instance to reach `RUNNING` state. If it does, extract the public IP and print the SSH connection command.
7. **Repeat** — Increment the success counter and loop back to step 2.

---

## Prerequisites

| Requirement                  | Details                                                                                         |
| :--------------------------- | :---------------------------------------------------------------------------------------------- |
| **OCI CLI**                  | Installed and configured (`oci setup config`). Verify with `oci iam region list`.               |
| **OCI Account**              | Free Tier or Pay-As-You-Go. Free Tier accounts are deprioritized for capacity — see [tips](#increasing-success-probability). |
| **SSH Key Pair**             | An existing SSH public key to inject into the instance for remote access.                       |
| **Bash 4.x+**               | Standard on any modern Linux distribution. macOS users need Homebrew bash.                      |
| **jq** *(recommended)*      | Not strictly required by the script, but useful for inspecting OCI CLI JSON responses manually. |
| **Tenancy in ap-mumbai-1**   | The script targets Mumbai. Your tenancy must have this region subscribed (or modify the script). |

---

## Environment Variables

The script reads sensitive configuration from `/etc/yatrax/.env`. This file must exist and be readable by the user running the script.

> ⚠️ **Never commit `.env` files to version control.** Add `.env` to your `.gitignore` and restrict file permissions: `chmod 600 /etc/yatrax/.env`

| Variable              | Description                                                   | Example Value                                      | Required |
| :-------------------- | :------------------------------------------------------------ | :------------------------------------------------- | :------: |
| `COMPARTMENT_ID`      | OCI compartment OCID where instances will be created          | `ocid1.compartment.oc1..aaaaaaaxxxxxxx`            |    ✅    |
| `SUBNET_OCID`         | OCID of the public subnet for instance VNIC attachment        | `ocid1.subnet.oc1.ap-mumbai-1..aaaaaaaxxxxxxx`    |    ✅    |
| `IMAGE_OCID`          | OCID of the Ampere-compatible OS image (e.g., Oracle Linux, Ubuntu aarch64) | `ocid1.image.oc1.ap-mumbai-1..aaaaaaaxxxxxxx`     |    ✅    |
| `SSH_PUBLIC_KEY_PATH`  | Absolute path to the SSH public key file to inject into the instance | `/home/user/.ssh/id_rsa.pub`                       |    ✅    |
| `DISPLAY_NAME_PREFIX`  | Prefix for auto-generated instance display names              | `yatrax-ampere`                                    |    ❌    |

**Example `/etc/yatrax/.env`:**

```env
# OCI Ampere Auto-Provisioner Configuration
# ──────────────────────────────────────────

COMPARTMENT_ID=ocid1.compartment.oc1..aaaaaaaexamplecompartmentid
SUBNET_OCID=ocid1.subnet.oc1.ap-mumbai-1..aaaaaaaexamplesubnetid
IMAGE_OCID=ocid1.image.oc1.ap-mumbai-1..aaaaaaaexampleimageid
SSH_PUBLIC_KEY_PATH=/home/opc/.ssh/id_rsa.pub
DISPLAY_NAME_PREFIX=yatrax-ampere
```

---

## Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/sutharnarendra/SportsKeeda_Shivam.git
cd SportsKeeda_Shivam/oci-ampere-provisioner

# 2. Create the config directory and .env file
sudo mkdir -p /etc/yatrax
sudo nano /etc/yatrax/.env
# → Paste your COMPARTMENT_ID, SUBNET_OCID, IMAGE_OCID, SSH_PUBLIC_KEY_PATH

# 3. Lock down permissions on the secrets file
sudo chmod 600 /etc/yatrax/.env
sudo chown $(whoami):$(whoami) /etc/yatrax/.env

# 4. Ensure your SSH public key exists
ls -la ~/.ssh/id_rsa.pub
# If not, generate one:
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# 5. Make the provisioner executable
chmod +x provision-ampere.sh

# 6. Verify OCI CLI works
oci iam availability-domain list --compartment-id <YOUR_COMPARTMENT_ID>

# 7. Run it
./provision-ampere.sh
```

---

## Configuration

These values are defined as variables at the top of `provision-ampere.sh`. Modify them directly in the script to match your environment.

| Variable          | Default Value                                        | Description                                                                 |
| :---------------- | :--------------------------------------------------- | :-------------------------------------------------------------------------- |
| `AD_NAME`         | `QkgJ:AP-MUMBAI-1-AD-1`                             | Availability Domain name. Mumbai has a single AD. Find yours via `oci iam availability-domain list`. |
| `IMAGE_OCID`      | *(loaded from .env)*                                 | ARM-compatible OS image OCID. Must be an `aarch64` image in `ap-mumbai-1`.  |
| `SHAPE`           | `VM.Standard.A1.Flex`                                | OCI compute shape. This is the only Ampere shape on the free tier.          |
| `OCPUS`           | `2`                                                  | Number of OCPUs per instance. Free tier total: 4 OCPUs across all A1 instances. |
| `MEMORY_IN_GBS`   | `12`                                                 | RAM in GB per instance. Free tier total: 24 GB across all A1 instances.     |
| `DELAY`           | `60`                                                 | Initial retry delay in seconds after a failed launch attempt.               |
| `DELAY_INCREMENT` | `30`                                                 | Seconds added to the delay after each consecutive failure (exponential backoff). |
| `MAX_DELAY`       | `300`                                                | Maximum retry delay in seconds (5-minute cap).                              |
| `JITTER_MAX`      | `30`                                                 | Maximum random jitter in seconds added to each delay to prevent thundering herd. |
| `MAX_INSTANCES`   | `2`                                                  | Total number of instances to create before the script exits.                |
| `POLL_INTERVAL`   | `30`                                                 | Seconds between lifecycle state polls after a successful launch API call.   |
| `POLL_TIMEOUT`    | `600`                                                | Maximum seconds to wait for an instance to reach `RUNNING` state (10 min).  |

> ⚠️ **Free Tier limits:** You get a combined total of **4 OCPUs** and **24 GB RAM** across all A1.Flex instances. The defaults (2 OCPU × 12 GB × 2 instances) use the full allocation. Adjust `OCPUS`, `MEMORY_IN_GBS`, and `MAX_INSTANCES` if you want a different split.

---

## Usage

### Basic run

```bash
./provision-ampere.sh
```

### Run in background (recommended for long waits)

```bash
nohup ./provision-ampere.sh > provision.log 2>&1 &
echo $!  # prints the PID
```

### Monitor logs in real time

```bash
tail -f provision.log
```

### Check if it's still running

```bash
ps aux | grep provision-ampere
```

### Stop the provisioner

```bash
# Find the PID
ps aux | grep provision-ampere

# Kill it
kill <PID>
```

---

## Sample Output

```text
[2026-06-07 02:14:33] ══════════════════════════════════════════════════════════
[2026-06-07 02:14:33]  YatraX Ampere Auto-Provisioner v1.0
[2026-06-07 02:14:33]  Region: ap-mumbai-1 | Shape: VM.Standard.A1.Flex
[2026-06-07 02:14:33]  Target: 2 instances (2 OCPU / 12 GB each)
[2026-06-07 02:14:33] ══════════════════════════════════════════════════════════
[2026-06-07 02:14:33] Loading config from /etc/yatrax/.env... OK
[2026-06-07 02:14:33] Instances created: 0 / 2
[2026-06-07 02:14:34] Attempt #1 — Launching instance 'yatrax-ampere-1'...
[2026-06-07 02:14:37] ✗ FAILED: Out of host capacity. The host doesn't have enough capacity.
[2026-06-07 02:14:37] Retrying in 74s (base: 60s + jitter: 14s)...
[2026-06-07 02:15:51] Attempt #2 — Launching instance 'yatrax-ampere-1'...
[2026-06-07 02:15:54] ✗ FAILED: Out of host capacity. The host doesn't have enough capacity.
[2026-06-07 02:15:54] Retrying in 108s (base: 90s + jitter: 18s)...
[2026-06-07 02:17:42] Attempt #3 — Launching instance 'yatrax-ampere-1'...
[2026-06-07 02:17:46] ✓ Launch accepted! Instance OCID: ocid1.instance.oc1.ap-mumbai-1..aaaaaaaexample123
[2026-06-07 02:17:46] Polling lifecycle state (timeout: 10m)...
[2026-06-07 02:18:16]   State: PROVISIONING
[2026-06-07 02:18:46]   State: PROVISIONING
[2026-06-07 02:19:16]   State: RUNNING ✓
[2026-06-07 02:19:18] ══════════════════════════════════════════════════════════
[2026-06-07 02:19:18]  ✓ Instance #1 is RUNNING
[2026-06-07 02:19:18]  Public IP: 152.67.xx.xxx
[2026-06-07 02:19:18]  SSH: ssh -i ~/.ssh/id_rsa opc@152.67.xx.xxx
[2026-06-07 02:19:18] ══════════════════════════════════════════════════════════
[2026-06-07 02:19:18] Instances created: 1 / 2
[2026-06-07 02:19:19] Attempt #1 — Launching instance 'yatrax-ampere-2'...
[2026-06-07 02:19:22] ✗ FAILED: Out of host capacity. The host doesn't have enough capacity.
[2026-06-07 02:19:22] Retrying in 82s (base: 60s + jitter: 22s)...
...
[2026-06-07 03:41:07] ✓ Launch accepted! Instance OCID: ocid1.instance.oc1.ap-mumbai-1..aaaaaaaexample456
[2026-06-07 03:41:07] Polling lifecycle state (timeout: 10m)...
[2026-06-07 03:42:07]   State: PROVISIONING
[2026-06-07 03:42:07]   State: RUNNING ✓
[2026-06-07 03:42:09] ══════════════════════════════════════════════════════════
[2026-06-07 03:42:09]  ✓ Instance #2 is RUNNING
[2026-06-07 03:42:09]  Public IP: 129.154.xx.xxx
[2026-06-07 03:42:09]  SSH: ssh -i ~/.ssh/id_rsa opc@129.154.xx.xxx
[2026-06-07 03:42:09] ══════════════════════════════════════════════════════════
[2026-06-07 03:42:09] ✓ All 2 instances provisioned successfully. Exiting.
```

---

## Increasing Success Probability

### 1. Upgrade to Pay-As-You-Go (PAYG)

Oracle explicitly deprioritizes Always Free Tier accounts for capacity allocation. Upgrading to PAYG (even if you never spend a dime beyond the free limits) significantly improves your chances. Your always-free resources remain free — you just gain priority.

### 2. Target off-peak hours

Capacity tends to free up during low-demand windows in the IST timezone:

| Window (IST)       | Success Likelihood |
| :------------------ | :----------------- |
| 01:00 AM – 05:00 AM | 🟢 High            |
| 05:00 AM – 09:00 AM | 🟡 Medium          |
| 09:00 AM – 11:00 PM | 🔴 Low             |
| 11:00 PM – 01:00 AM | 🟡 Medium          |

Start the script before going to bed. Let it grind overnight.

### 3. Tune the retry delay

The default backoff starts at 60s and caps at 300s. If you're seeing consistent failures for hours, capacity is genuinely scarce — shorter delays won't help and will only waste API calls. However, if you're on PAYG during off-peak hours, you can lower `DELAY` to `30` and `DELAY_INCREMENT` to `15` for faster cycling.

### 4. Single availability domain awareness

Mumbai (`ap-mumbai-1`) has only **one** availability domain (`QkgJ:AP-MUMBAI-1-AD-1`). You cannot spread requests across multiple ADs. Every user in the region competes for the same pool.

### 5. Request a service limit increase

For PAYG accounts, you can request a limit increase through the OCI Console under **Governance → Limits, Quotas and Usage**. This doesn't guarantee capacity but can unlock additional allocation when slots open.

---

## Caveats & Limitations

> ⚠️ **Oracle Terms of Service:** Automated retry scripts are a common community practice, but Oracle has not officially endorsed or prohibited them. Use at your own discretion. Excessive API calls could theoretically trigger rate limiting, though the backoff/jitter strategy in this script mitigates that risk.

- **Single region** — Hardcoded to `ap-mumbai-1`. Modify the script manually for other regions (Hyderabad, Singapore, etc.).
- **Single availability domain** — Mumbai has only one AD. Multi-AD regions like Phoenix or Ashburn could benefit from AD rotation, but this script doesn't implement that.
- **No state persistence** — If the script is killed mid-run, it has no memory of previously created instances. It will start the count from zero on the next run.
- **No cleanup on failure** — If an instance launches but never reaches `RUNNING` state within the 10-minute timeout, it is left in whatever state it's in. You'll need to terminate it manually via the OCI Console.
- **No notifications** — The script logs to stdout/file only. There are no push notifications, emails, or webhook alerts on success.
- **SSH key is injected at launch** — The public key cannot be changed after instance creation through this script. Use `ssh-copy-id` or cloud-init for additional keys.

---

## Roadmap

- [ ] **Multi-region support** — Cycle through a list of regions (`ap-mumbai-1`, `ap-hyderabad-1`, `ap-singapore-1`) and attempt launch in each
- [ ] **Telegram/email notification** — Send a message via Telegram Bot API or Resend/SendGrid when an instance reaches `RUNNING`
- [ ] **Auto SSH key injection** — Accept the SSH public key as a CLI argument instead of requiring it in `.env`
- [ ] **External config file** — Move all hardcoded variables (shape, OCPUs, RAM, delay params) into a YAML/TOML config file
- [ ] **State persistence** — Track created instance OCIDs in a local state file to survive script restarts
- [ ] **Multi-AD rotation** — For regions with multiple ADs, rotate launch attempts across ADs
- [ ] **Rate limit detection** — Detect HTTP 429 responses and switch to a longer backoff automatically
- [ ] **Dry-run mode** — Validate config and print what would be launched without calling the API

---

## Contributing

Contributions are welcome. Here's how:

1. **Fork** the repository
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/multi-region-support
   ```
3. **Make your changes** — follow the existing code style (POSIX-ish bash, `snake_case` variables, timestamped logging)
4. **Test locally** — run with a dry-run or against a non-production compartment
5. **Commit** with a descriptive message:
   ```bash
   git commit -m "feat: add multi-region rotation with fallback"
   ```
6. **Push** and open a **Pull Request** against `main`

Please open an issue first for large changes or architectural discussions.

---

## License

This project is licensed under the **MIT License**.

```text
MIT License

Copyright (c) 2026 YatraX

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
