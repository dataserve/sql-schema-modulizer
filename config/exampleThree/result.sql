CREATE DATABASE dbName;

CREATE TABLE `audio` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL DEFAULT '',
  `mime` varchar(128) NOT NULL DEFAULT '',
  `audio_comment_cnt` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `audio_comment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `comment_guest_id` int NOT NULL DEFAULT '0',
  `comment` varchar(512) NOT NULL DEFAULT '',
  `audio_id` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_guest_id` (`comment_guest_id`),
  KEY `audio_id` (`audio_id`),
  CONSTRAINT `audio_comment_ibfk_1` FOREIGN KEY (`audio_id`) REFERENCES `audio` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `audio_comment_ibfk_2` FOREIGN KEY (`comment_guest_id`) REFERENCES `comment_guest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `comment_guest` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(128) NOT NULL DEFAULT '',
  `url` varchar(255) NOT NULL DEFAULT '',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `photo` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL DEFAULT '',
  `mime` varchar(128) NOT NULL DEFAULT '',
  `photo_comment_cnt` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `photo_comment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `comment_guest_id` int NOT NULL DEFAULT '0',
  `comment` varchar(512) NOT NULL DEFAULT '',
  `photo_id` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_guest_id` (`comment_guest_id`),
  KEY `photo_id` (`photo_id`),
  CONSTRAINT `photo_comment_ibfk_1` FOREIGN KEY (`photo_id`) REFERENCES `photo` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `photo_comment_ibfk_2` FOREIGN KEY (`comment_guest_id`) REFERENCES `comment_guest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `prepend_video` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL DEFAULT '',
  `mime` varchar(128) NOT NULL DEFAULT '',
  `prepend_video_comment_cnt` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `prepend_video_comment` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `comment_guest_id` int NOT NULL DEFAULT '0',
  `comment` varchar(512) NOT NULL DEFAULT '',
  `prepend_video_id` int NOT NULL DEFAULT '0',
  `mtime` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  `ctime` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  KEY `comment_guest_id` (`comment_guest_id`),
  KEY `prepend_video_id` (`prepend_video_id`),
  CONSTRAINT `prepend_video_comment_ibfk_1` FOREIGN KEY (`prepend_video_id`) REFERENCES `prepend_video` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `prepend_video_comment_ibfk_2` FOREIGN KEY (`comment_guest_id`) REFERENCES `comment_guest` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
