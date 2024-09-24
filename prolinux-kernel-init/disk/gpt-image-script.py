from gpt_image.disk import Disk
from gpt_image.partition import Partition, PartitionType

disk = Disk("disk-image.raw")

disk_size = 1 * 1024 * 1024 * 1024
boot_size = 512 * 1024 * 1024
root_size = 400 * 1024 * 1024

disk.create(disk_size)

# create a 512MB Linux partition named "boot"
boot_part = Partition(
        "prolinux_boot", 
        boot_size,
        PartitionType.EFI_SYSTEM_PARTITION.value
    )
disk.table.partitions.add(boot_part)

# fill the rest with a Linux partition
data_part = Partition(
        "prolinux_data", 
        root_size,
        PartitionType.LINUX_FILE_SYSTEM.value
    )
disk.table.partitions.add(data_part)

# commit the change to disk
disk.commit()

# dump the current GPT information:

print(disk)
