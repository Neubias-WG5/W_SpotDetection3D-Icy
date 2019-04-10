import os
import sys
from cytomine.models import *
from subprocess import call
from pathlib import Path
from neubiaswg5 import CLASS_SPTCNT
from neubiaswg5.helpers import prepare_data, NeubiasJob, upload_data, upload_metrics

def main():
    with NeubiasJob.from_cli(sys.argv[1:]) as nj:
        nj.job.update(status=Job.RUNNING, progress=0, statusComment="Initialisation...")

        # 1. Create working directories on the machine:
        # 2. Download (or read) data
        problem_cls = CLASS_SPTCNT
        is_2d = False
        in_images, gt_images, in_path, gt_path, out_path, tmp_path = prepare_data(problem_cls, nj, is_2d=False, **nj.flags)

        # 3. Execute workflow
        scale = nj.parameters.icy_scale
        sensitivity = nj.parameters.icy_sensitivity

        nj.job.update(progress=25, statusComment="Launching workflow...")
        # Modify the parameters in the job.xml file 
        replaceScaleParameterCommand = "sed -i '/scale/c\\t<parameter name=\"scale\">{}</parameter>' job.xml".format(scale)
        replaceSensitivityParameterCommand = "sed -i '/sensitivity/c\\t<parameter name=\"sensitivity\">{}</parameter>' job.xml".format(sensitivity)
        replaceInputFolderParameterCommand = "sed -i '/inputFolder/c\\t<parameter name=\"inputFolder\">{}</parameter>' job.xml".format(in_path)
        replaceOutputFolderParameterCommand = "sed -i '/outputFolder/c\\t<parameter name=\"outputFolder\">{}</parameter>' job.xml".format(out_path)
        call(replaceScaleParameterCommand, shell=True, cwd="/icy")
        call(replaceSensitivityParameterCommand, shell=True, cwd="/icy")
        call(replaceInputFolderParameterCommand, shell=True, cwd="/icy")
        call(replaceOutputFolderParameterCommand, shell=True, cwd="/icy")

        # Run script in ICY

        command = "java -jar --headless --execute plugins.volker.commandlinescriptrunner.CommandLineScriptRunner "
        call(command, shell=True, cwd="/icy")

        # 4. Upload the annotation and labels to Cytomine
        upload_data(problem_cls, nj, in_images, out_path, **nj.flags, is_2d=is_2d, monitor_params={
           "start": 60, "end": 90, "period": 0.1
        })

        # 5. Compute and upload the metrics
        nj.job.update(progress=90, statusComment="Computing and uploading metrics...")
        upload_metrics(problem_cls, nj, in_images, gt_path, out_path, tmp_path, **nj.flags)

        nj.job.update(progress=100, status=Job.TERMINATED, status_comment="Finished.")


if __name__ == "__main__":
    main()
